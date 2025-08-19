import { Duplex, DuplexOptions } from 'readable-stream';
import type { Runtime } from 'webextension-polyfill';

/**
 * A function to log messages.
 *
 * @param data - the data to log
 * @param outgoing - whether the data is outgoing (true) or incoming (false)
 */
type Log = (data: unknown, outgoing: boolean) => void;

/**
 * Options for the ExtensionPortStream.
 *
 * @property log - a function to log messages
 * @property debug - whether to enable debug mode
 * @property chunkSize - the size of each chunk in bytes
 */
export type Options = {
  log?: Log;
} & DuplexOptions;

export class ExtensionPortStream extends Duplex {
  readonly #port: Runtime.Port;

  #log: Log;

  /**
   * @param port - An instance of WebExtensions Runtime.Port. See:
   * {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port}
   * @param options - stream options passed on to Duplex stream constructor
   */
  constructor(port: Runtime.Port, { log, ...streamOptions }: Options = {}) {
    super({
      objectMode: true,
      highWaterMark: 256,
      ...streamOptions,
    });

    this.#port = port;
    port.onMessage.addListener(this.#onMessage);
    port.onDisconnect.addListener(this.#onDisconnect);
    this.#log = log ?? (() => undefined);
  }

  /**
   * Callback triggered when a message is received from
   * the remote Port associated with this Stream.
   *
   * @param msg - Payload from the onMessage listener of the port
   */
  readonly #onMessage = (msg: unknown, _port: Runtime.Port) => {
    this.#log(msg, false);
    this.push(msg);
  };

  /**
   * Callback triggered when the remote Port associated with this Stream
   * disconnects.
   */
  #onDisconnect = (): void => {
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
   * @param encoding - Encoding to use when writing payload
   * @param cb - Called when writing is complete or an error occurs
   */
  override _write(
    msg: unknown,
    _encoding: BufferEncoding,
    cb: (error?: Error | null) => void,
  ): void {
    try {
      this.#log(msg, true);
      this.#port.postMessage(msg);
    } catch (error) {
      return cb(new Error('PortDuplexStream - disconnected'));
    }
    return cb();
  }

  /**
   * Call to set a custom logger for incoming/outgoing messages
   *
   * @param log - the logger function
   */
  setLogger(log: Log) {
    this.#log = log;
  }
}
