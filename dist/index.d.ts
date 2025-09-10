import type { Json } from '@metamask/utils';
import { Duplex } from 'readable-stream';
import type { Runtime } from 'webextension-polyfill';
import type { Log, Options } from './types';
export type { Log, Options, TransportChunkFrame, MessageTooLargeEventData, } from './types';
export { CHUNK_SIZE } from './constants';
export declare class ExtensionPortStream extends Duplex {
    #private;
    /**
     * Returns the configured chunk size in bytes.
     */
    getChunkSize(): number;
    /**
     * @param port - An instance of WebExtensions Runtime.Port. See:
     * {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port}
     * @param options - stream options passed on to Duplex stream constructor
     */
    constructor(port: Runtime.Port, { chunkSize, log, ...streamOptions }?: Options);
    /**
     * Explicitly sets read operations to a no-op.
     */
    _read(): void;
    /**
     * Called internally when data should be written to this writable stream.
     *
     * @param msg - Arbitrary object to write
     * @param encoding - Encoding to use when writing payload (must be UTF-8)
     * @param callback - Called when writing is complete or an error occurs
     */
    _write(msg: Json, encoding: BufferEncoding, callback: (error?: Error | null) => void): Promise<void>;
    /**
     * Call to set a custom logger for incoming/outgoing messages
     *
     * @param log - the logger function
     */
    setLogger(log: Log): void;
    /**
     * Handles chunked messages.
     *
     * @param chunk - the {@link ChunkFrame} received from the port
     */
    private handleChunk;
}
