import { Duplex } from 'stream';

export default class PortDuplexStream extends Duplex {
  private _port: Record<string, any>;

  constructor(port: Record<string, any>) {
    super({ objectMode: true });
    this._port = port;
    this._port.onMessage.addListener((msg: any) => this._onMessage(msg));
    this._port.onDisconnect.addListener(() => this._onDisconnect());
  }

  /**
   * Callback triggered when a message is received from
   * the remote Port associated with this Stream.
   *
   * @private
   * @param msg - Payload from the onMessage listener of Port
   */
  _onMessage(msg: any): void {
    if (Buffer.isBuffer(msg)) {
      // delete msg._isBuffer;
      const data = Buffer.from(msg);
      this.push(data);
    } else {
      this.push(msg);
    }
  }

  /**
   * Callback triggered when the remote Port
   * associated with this Stream disconnects.
   *
   * @private
   */
  _onDisconnect(): void {
    this.destroy();
  }

  /**
   * Explicitly sets read operations to a no-op
   */
  _read(): undefined {
    return undefined;
  }

  /**
   * Called internally when data should be written to
   * this writable stream.
   *
   * @private
   * @param msg Arbitrary object to write
   * @param encoding Encoding to use when writing payload
   * @param cb Called when writing is complete or an error occurs
   */
  _write(msg: any, _encoding: BufferEncoding, cb: (error?: Error | null) => void): void {
    try {
      if (Buffer.isBuffer(msg)) {
        const data: Record<string, any> = msg.toJSON();
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
}
