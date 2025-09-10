"use strict";
/* eslint-disable no-invalid-this */
// disabled these eslint rules because its very noisy in here with them:
// 1. no-invalid-this the `this` is use here is valid, eslint is being stupid.
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ExtensionPortStream_instances, _ExtensionPortStream_port, _ExtensionPortStream_log, _ExtensionPortStream_inFlight, _ExtensionPortStream_chunkSize, _ExtensionPortStream_onMessage, _ExtensionPortStream_onDisconnect, _ExtensionPortStream_safeCallback, _ExtensionPortStream_postMessage;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionPortStream = exports.CHUNK_SIZE = void 0;
const readable_stream_1 = require("readable-stream");
const constants_1 = require("./constants");
const parsing_1 = require("./parsing");
const chunking_1 = require("./chunking");
var constants_2 = require("./constants");
Object.defineProperty(exports, "CHUNK_SIZE", { enumerable: true, get: function () { return constants_2.CHUNK_SIZE; } });
class ExtensionPortStream extends readable_stream_1.Duplex {
    /**
     * Returns the configured chunk size in bytes.
     */
    getChunkSize() {
        return __classPrivateFieldGet(this, _ExtensionPortStream_chunkSize, "f");
    }
    /**
     * @param port - An instance of WebExtensions Runtime.Port. See:
     * {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port}
     * @param options - stream options passed on to Duplex stream constructor
     */
    constructor(port, { chunkSize, log, ...streamOptions } = {}) {
        if (chunkSize && chunkSize < constants_1.MIN_CHUNK_SIZE) {
            throw new Error(`Cannot chunk messages smaller than the min chunk size, ${constants_1.MIN_CHUNK_SIZE}`);
        }
        super({
            objectMode: true,
            highWaterMark: 256,
            ...streamOptions,
        });
        _ExtensionPortStream_instances.add(this);
        _ExtensionPortStream_port.set(this, void 0);
        _ExtensionPortStream_log.set(this, void 0);
        _ExtensionPortStream_inFlight.set(this, new Map());
        _ExtensionPortStream_chunkSize.set(this, void 0);
        /**
         * Callback triggered when a message is received from
         * the remote Port associated with this Stream.
         *
         * @param msg - Payload from the onMessage listener of the port
         * @param _port - the port that sent the message
         */
        _ExtensionPortStream_onMessage.set(this, (msg, _port) => {
            if (__classPrivateFieldGet(this, _ExtensionPortStream_chunkSize, "f") > 0) {
                const frame = (0, parsing_1.maybeParseAsChunkFrame)(msg);
                if (frame !== null) {
                    this.handleChunk(frame);
                    return;
                }
            }
            // handle smaller, un‑framed messages
            __classPrivateFieldGet(this, _ExtensionPortStream_log, "f").call(this, msg, false);
            this.push(msg);
        });
        /**
         * Cleans up the stream and buffered chunks when the port is disconnected.
         *
         * @param _port - the port that was disconnected
         */
        _ExtensionPortStream_onDisconnect.set(this, (_port) => {
            // clean up, as we aren't going to receive any more messages
            __classPrivateFieldGet(this, _ExtensionPortStream_inFlight, "f").clear();
            this.destroy(new Error('Port disconnected'));
        });
        __classPrivateFieldSet(this, _ExtensionPortStream_port, port, "f");
        port.onMessage.addListener(__classPrivateFieldGet(this, _ExtensionPortStream_onMessage, "f"));
        port.onDisconnect.addListener(__classPrivateFieldGet(this, _ExtensionPortStream_onDisconnect, "f"));
        __classPrivateFieldSet(this, _ExtensionPortStream_log, log ?? (() => undefined), "f");
        __classPrivateFieldSet(this, _ExtensionPortStream_chunkSize, chunkSize ?? constants_1.CHUNK_SIZE, "f");
    }
    /**
     * Explicitly sets read operations to a no-op.
     */
    _read() {
        // No-op, push happens in onMessage.
    }
    /**
     * Called internally when data should be written to this writable stream.
     *
     * @param msg - Arbitrary object to write
     * @param encoding - Encoding to use when writing payload (must be UTF-8)
     * @param callback - Called when writing is complete or an error occurs
     */
    async _write(msg, encoding, callback) {
        if (encoding && encoding !== 'utf8' && encoding !== 'utf-8') {
            __classPrivateFieldGet(this, _ExtensionPortStream_instances, "m", _ExtensionPortStream_safeCallback).call(this, callback, new Error('ExtensionPortStream only supports UTF-8 encoding'));
            return;
        }
        try {
            // try to send the chunk as is first, it is probably fine!
            __classPrivateFieldGet(this, _ExtensionPortStream_instances, "m", _ExtensionPortStream_postMessage).call(this, msg);
            __classPrivateFieldGet(this, _ExtensionPortStream_log, "f").call(this, msg, true);
            __classPrivateFieldGet(this, _ExtensionPortStream_instances, "m", _ExtensionPortStream_safeCallback).call(this, callback);
        }
        catch (err) {
            if (err instanceof Error) {
                if (
                // if the error is about message size being too large
                // note: this message doesn't currently happen on firefox, as it doesn't
                // have a maximum message size
                err.message === 'Message length exceeded maximum allowed length.') {
                    const chunkSize = __classPrivateFieldGet(this, _ExtensionPortStream_chunkSize, "f");
                    // Emit event when message is too large and needs to be chunked
                    this.emit('message-too-large', {
                        message: msg,
                        chunkSize,
                        originalError: err,
                    });
                    // chunking is enabled
                    if (chunkSize > 0) {
                        try {
                            // we can't just send it in one go; we need to chunk it
                            for await (const frame of (0, chunking_1.toFrames)(msg, chunkSize)) {
                                __classPrivateFieldGet(this, _ExtensionPortStream_instances, "m", _ExtensionPortStream_postMessage).call(this, frame);
                            }
                            __classPrivateFieldGet(this, _ExtensionPortStream_log, "f").call(this, msg, true);
                            __classPrivateFieldGet(this, _ExtensionPortStream_instances, "m", _ExtensionPortStream_safeCallback).call(this, callback);
                        }
                        catch (chunkErr) {
                            __classPrivateFieldGet(this, _ExtensionPortStream_instances, "m", _ExtensionPortStream_safeCallback).call(this, callback, new AggregateError([chunkErr], 'ExtensionPortStream chunked postMessage failed'));
                        }
                        return;
                    }
                }
                __classPrivateFieldGet(this, _ExtensionPortStream_instances, "m", _ExtensionPortStream_safeCallback).call(this, callback, new AggregateError([err], 'ExtensionPortStream postMessage failed'));
            }
            else {
                // error is unknown.
                __classPrivateFieldGet(this, _ExtensionPortStream_instances, "m", _ExtensionPortStream_safeCallback).call(this, callback, new AggregateError([new Error(String(err))], 'ExtensionPortStream postMessage failed'));
            }
        }
    }
    /**
     * Call to set a custom logger for incoming/outgoing messages
     *
     * @param log - the logger function
     */
    setLogger(log) {
        __classPrivateFieldSet(this, _ExtensionPortStream_log, log, "f");
    }
    /**
     * Handles chunked messages.
     *
     * @param chunk - the {@link ChunkFrame} received from the port
     */
    handleChunk(chunk) {
        const { id, seq, fin, source, dataIndex } = chunk;
        let entry = __classPrivateFieldGet(this, _ExtensionPortStream_inFlight, "f").get(id);
        if (entry === undefined) {
            entry = {
                parts: [],
                expected: 0,
            };
            __classPrivateFieldGet(this, _ExtensionPortStream_inFlight, "f").set(id, entry);
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
            entry.parts.filter(Boolean).length === entry.expected) {
            __classPrivateFieldGet(this, _ExtensionPortStream_inFlight, "f").delete(id);
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
            __classPrivateFieldGet(this, _ExtensionPortStream_log, "f").call(this, value, false);
        }
    }
}
exports.ExtensionPortStream = ExtensionPortStream;
_ExtensionPortStream_port = new WeakMap(), _ExtensionPortStream_log = new WeakMap(), _ExtensionPortStream_inFlight = new WeakMap(), _ExtensionPortStream_chunkSize = new WeakMap(), _ExtensionPortStream_onMessage = new WeakMap(), _ExtensionPortStream_onDisconnect = new WeakMap(), _ExtensionPortStream_instances = new WeakSet(), _ExtensionPortStream_safeCallback = function _ExtensionPortStream_safeCallback(callback, error) {
    queueMicrotask(() => callback(error));
}, _ExtensionPortStream_postMessage = function _ExtensionPortStream_postMessage(message) {
    __classPrivateFieldGet(this, _ExtensionPortStream_port, "f").postMessage(message);
};
//# sourceMappingURL=index.js.map