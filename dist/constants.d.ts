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
export declare const CHUNK_SIZE: number;
export declare const MIN_CHUNK_SIZE: 24;
