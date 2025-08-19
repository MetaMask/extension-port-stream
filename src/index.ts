import { Duplex, DuplexOptions } from 'readable-stream';
import type { Runtime } from 'webextension-polyfill';

type Log = (data: unknown, out: boolean) => void;

export class ExtensionPortStream extends Duplex {
  readonly #port: Runtime.Port;

  #log: Log;

  /**
   * @param port - An instance of WebExtensions Runtime.Port. See:
   * {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port}
   * @param streamOptions - stream options passed on to Duplex stream constructor
   */
  constructor(port: Runtime.Port, streamOptions: DuplexOptions = {}) {
    super({
      objectMode: true,
      ...streamOptions,
    });

    this.#port = port;
    port.onMessage.addListener(this.#onMessage);
    port.onDisconnect.addListener(this.#onDisconnect);
    this.#log = () => null;
  }

  /**
   * Callback triggered when a message is received from
   * the remote Port associated with this Stream.
   *
   * @param msg - Payload from the onMessage listener of the port
   */
  readonly #onMessage = (msg: unknown, _port: Runtime.Port) => {
    if (Buffer.isBuffer(msg)) {
      const data: Buffer = Buffer.from(msg);
      this.#log(data, false);
      this.push(data);
    } else {
      this.#log(msg, false);
      this.push(msg);
    }
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
      if (Buffer.isBuffer(msg)) {
        const data: Record<string, unknown> = msg.toJSON();
        data._isBuffer = true;
        this.#log(data, true);
        this.#port.postMessage(data);
      } else {
        this.#log(msg, true);
        this.#port.postMessage(msg);
      }
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
