import { Duplex } from 'stream';
import { Runtime } from 'webextension-polyfill-ts';

const browser: any  = globalThis.browser || globalThis.chrome;
const runtime: object = browser.runtime || {};

export = class PortDuplexStream extends Duplex {
  private _port: Runtime.Port;

  /**
   * @param port - An instance of WebExtensions Runtime.Port. See:
   * {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port}
   */
  constructor(port: Runtime.Port) {
    super({ objectMode: true });
    this._port = port;
    this._port.onMessage.addListener((msg: unknown) => this._onMessage(msg));
    this._port.onDisconnect.addListener((portObj) => {
      const err = portObj?.error || runtime.lastError;
      this._onDisconnect(err);
    });
  }

  /**
   * Callback triggered when a message is received from
   * the remote Port associated with this Stream.
   *
   * @param msg - Payload from the onMessage listener of the port
   */
  private _onMessage(msg: unknown): void {
    if (Buffer.isBuffer(msg)) {
      const data: Buffer = Buffer.from(msg);
      this.push(data);
    } else {
      this.push(msg);
    }
  }

  /**
   * Callback triggered when the remote Port associated with this Stream
   * disconnects.
   */
  private _onDisconnect(err?: Error): void {
    this.destroy(err);
  }

  /**
   * Explicitly sets read operations to a no-op.
   */
  _read(): void {
    return undefined;
  }

  /**
   * Called internally when data should be written to this writable stream.
   *
   * @param msg - Arbitrary object to write
   * @param encoding - Encoding to use when writing payload
   * @param cb - Called when writing is complete or an error occurs
   */
  _write(
    msg: unknown,
    _encoding: BufferEncoding,
    cb: (error?: Error | null) => void,
  ): void {
    try {
      if (Buffer.isBuffer(msg)) {
        const data: Record<string, unknown> = msg.toJSON();
        data._isBuffer = true;
        this._port.postMessage(data);
      } else {
        this._port.postMessage(msg);
      }
    } catch (error) {
      return cb(new Error('PortDuplexStream - disconnected'));
    }
    return cb();
  }
};
