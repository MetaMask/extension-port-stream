"use strict";
/* eslint-disable no-bitwise */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_CHUNK_SIZE = exports.CHUNK_SIZE = void 0;
/**
 * The default chunk size for the stream.
 *
 * Chromium has a maximum message size of 64 MB.
 *
 * FireFox's doesn't really have a maximum limit (I've tested it up to 2 GB), but
 * it does limit the size of the strings you can send to 1 GB per string.
 *
 * So we can just send messages on FireFox without chunking.
 *
 * We can't measure the byte size of an internal V8 message in JavaScript, so we
 * leave a lot of headroom; we use 32MB chunks in Chromium.
 *
 * Chromium limit: 1 << 26 (64 MB)
 * Firefox limit: 0 (no chunking, send as is)
 */
exports.CHUNK_SIZE = globalThis.navigator.userAgent.includes('Firefox')
    ? 0
    : 1 << 26;
// `2147483647|2147483647|1` is 23, then add 1 because we require 1 character of
// data. `2147483647` is the max Int32 we allow for the `id`. A seq of
// 2147483647 is impossible at a realistic CHUNK_SIZE, as it would consume way
// more memory than V8 will allow in a single string or ArrayBuffer.
exports.MIN_CHUNK_SIZE = 24;
//# sourceMappingURL=constants.js.map