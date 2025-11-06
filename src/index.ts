/* eslint-disable no-invalid-this */
// disabled these eslint rules because its very noisy in here with them:
// 1. no-invalid-this the `this` is use here is valid, eslint is being stupid.

import type { Json } from '@metamask/utils';
import { Duplex } from 'readable-stream';
import type { Runtime } from 'webextension-polyfill';
import type {
  Log,
  Options,
  Id,
  QueuedEntry,
  ChunkFrame,
  TransportChunkFrame,
  MessageTooLargeEventData,
} from './types';
import { MIN_CHUNK_SIZE, CHUNK_SIZE } from './constants';
import { maybeParseAsChunkFrame } from './parsing';
import { toFrames } from './chunking';

export type {
  Log,
  Options,
  TransportChunkFrame,
  MessageTooLargeEventData,
} from './types';
export { CHUNK_SIZE } from './constants';

export class ExtensionPortStream extends Duplex {
  static readonly ErrorMessages = [
    // used after 2025-10-24. see https://source.chromium.org/chromium/chromium/src/+/main:extensions/renderer/api/messaging/messaging_util.cc;l=99;bpv=1;bpt=0;drc=6e12249bb20a2aaf40f8b115e2ea07627c13f144;dlc=c8490d20ef70d32273aa08940bf138d6096c54b5
    'Message length exceeded maximum allowed length of 64MB.',
    // used before 2025-10-24. see https://source.chromium.org/chromium/chromium/src/+/main:extensions/renderer/api/messaging/messaging_util.cc;l=99;bpv=1;bpt=0;drc=6e12249bb20a2aaf40f8b115e2ea07627c13f144;dlc=c8490d20ef70d32273aa08940bf138d6096c54b5
    'Message length exceeded maximum allowed length.',
  ] as const;

  readonly #port: Runtime.Port;

  #log: Log;

  readonly #inFlight = new Map<Id, QueuedEntry>();

  readonly #chunkSize: number;

  /**
   * Returns the configured chunk size in bytes.
   */
  getChunkSize() {
    return this.#chunkSize;
  }

  /**
   * @param port - An instance of WebExtensions Runtime.Port. See:
   * {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port}
   * @param options - stream options passed on to Duplex stream constructor
   */
  constructor(
    port: Runtime.Port,
    { chunkSize, log, ...streamOptions }: Options = {},
  ) {
    if (chunkSize && chunkSize < MIN_CHUNK_SIZE) {
      throw new Error(
        `Cannot chunk messages smaller than the min chunk size, ${MIN_CHUNK_SIZE}`,
      );
    }

    super({
      objectMode: true,
      highWaterMark: 256,
      ...streamOptions,
    });

    this.#port = port;
    port.onMessage.addListener(this.#onMessage);
    port.onDisconnect.addListener(this.#onDisconnect);
    this.#log = log ?? (() => undefined);

    this.#chunkSize = chunkSize ?? CHUNK_SIZE;
  }

  /**
   * Callback triggered when a message is received from
   * the remote Port associated with this Stream.
   *
   * @param msg - Payload from the onMessage listener of the port
   * @param _port - the port that sent the message
   */
  readonly #onMessage = (msg: unknown, _port: Runtime.Port) => {
    if (this.#chunkSize > 0) {
      const frame = maybeParseAsChunkFrame(msg);
      if (frame !== null) {
        this.handleChunk(frame);
        return;
      }
    }

    // handle smaller, un‑framed messages
    this.#log(msg, false);
    this.push(msg);
  };

  /**
   * Cleans up the stream and buffered chunks when the port is disconnected.
   *
   * @param _port - the port that was disconnected
   */
  #onDisconnect = (_port: Runtime.Port) => {
    // clean up, as we aren't going to receive any more messages
    this.#inFlight.clear();
    this.destroy();
  };

  /**
   * Explicitly sets read operations to a no-op.
   */
  override _read() {
    // No-op, push happens in onMessage.
  }

  /**
   * Called internally when data should be written to this writable stream.
   *
   * @param msg - Arbitrary object to write
   * @param encoding - Encoding to use when writing payload (must be UTF-8)
   * @param callback - Called when writing is complete or an error occurs
   */
  override async _write(
    msg: Json,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): Promise<void> {
    if (encoding && encoding !== 'utf8' && encoding !== 'utf-8') {
      this.#safeCallback(
        callback,
        new Error('ExtensionPortStream only supports UTF-8 encoding'),
      );
      return;
    }

    try {
      // try to send the chunk as is first, it is probably fine!
      this.#postMessage(msg);
      this.#log(msg, true);
      this.#safeCallback(callback);
    } catch (err) {
      if (err instanceof Error) {
        if (
          // if the error is about message size being too large
          // note: this message doesn't currently happen on firefox, as it doesn't
          // have a maximum message size
          ExtensionPortStream.ErrorMessages.includes(err.message as typeof ExtensionPortStream.ErrorMessages[number])
        ) {
          const chunkSize = this.#chunkSize;
          // Emit event when message is too large and needs to be chunked
          this.emit('message-too-large', {
            message: msg,
            chunkSize,
            originalError: err,
          } satisfies MessageTooLargeEventData);

          // chunking is enabled
          if (chunkSize > 0) {
            try {
              // we can't just send it in one go; we need to chunk it
              for await (const frame of toFrames(msg, chunkSize)) {
                this.#postMessage(frame);
              }
              this.#log(msg, true);
              this.#safeCallback(callback);
            } catch (chunkErr) {
              this.#safeCallback(
                callback,
                new AggregateError(
                  [chunkErr],
                  'ExtensionPortStream chunked postMessage failed',
                ),
              );
            }
            return;
          }
        }
        this.#safeCallback(
          callback,
          new AggregateError([err], 'ExtensionPortStream postMessage failed'),
        );
      } else {
        // error is unknown.
        this.#safeCallback(
          callback,
          new AggregateError(
            [new Error(String(err))],
            'ExtensionPortStream postMessage failed',
          ),
        );
      }
    }
  }

  /**
   * Call to set a custom logger for incoming/outgoing messages
   *
   * @param log - the logger function
   */
  setLogger(log: Log) {
    this.#log = log;
  }

  /**
   * Safely invokes a callback by scheduling it in the microtask queue.
   * This prevents reentrancy issues where the callback might throw an exception
   * and cause the calling code to execute the callback again before returning.
   *
   * @param callback - the callback to invoke
   * @param error - the error to pass to the callback
   */
  #safeCallback(callback: (err?: Error | null) => void, error?: Error | null) {
    queueMicrotask(() => callback(error));
  }

  /**
   * Send a message to the other end. This takes one argument, which is a JSON
   * object representing the message to send. It will be delivered to any script
   * listening to the port's onMessage event, or to the native application if
   * this port is connected to a native application.
   *
   * @param message - the message to send
   */
  #postMessage(message: Json | TransportChunkFrame) {
    this.#port.postMessage(message);
  }

  /**
   * Handles chunked messages.
   *
   * @param chunk - the {@link ChunkFrame} received from the port
   */
  private handleChunk(chunk: ChunkFrame) {
    const { id, seq, fin, source, dataIndex } = chunk;

    let entry = this.#inFlight.get(id);
    if (entry === undefined) {
      entry = {
        parts: [],
        expected: 0,
      };
      this.#inFlight.set(id, entry);
    }
    if (fin === 1) {
      // we've received the final chunk
      entry.expected = seq + 1;
    }
    entry.parts[seq] = [source, dataIndex];

    if (
      // if we know how many to expect, we've already received the final chunk.
      entry.expected &&
      // Now we just need to ensure that we've got them all. Because we always
      // send in order, and chromium just happens to always deliver them in
      // order (I can't find documentation stating this is *always* the case),
      // this will always return `true` when `entry.expected` is not `0`.
      // Additionally, we *technically* don't disallow upstream Streams from
      // writing a `TransportChunkFrame` directly, and in whatever order they'd
      // like.
      entry.parts.filter(Boolean).length === entry.expected
    ) {
      this.#inFlight.delete(id);
      const { parts } = entry;
      const { length } = parts;
      // use an array and then a single `join()` to avoid creating large
      // intermediary strings if we used string concatenation via something like
      // `raw += src.slice(idx)`.
      const segments = new Array(length);
      for (let i = 0; i < length; i++) {
        const [src, idx] = parts[i];
        segments[i] = src.slice(idx);
      }

      // only one final, engine-optimized, large string allocation
      const raw = segments.join('');
      const value = JSON.parse(raw);
      this.push(value);
      this.#log(value, false);
    }
  }
}
