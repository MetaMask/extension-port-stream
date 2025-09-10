import type { Json } from '@metamask/utils';
import { type TransportChunkFrame } from './types';
/**
 * Converts a JSON object into an async generator of chunk frames.
 *
 * We use an async generator in order to allow other tasks to complete while
 * the chunking is happening.
 *
 * Chunks the payload at character boundaries, and is aware of "wide" characters
 * like 😀 (U+1F600) which is 4 UTF-8 bytes, but only 2 JS String#length
 * characters. It never splits across a grapheme boundary.
 *
 * @param payload - the payload to be chunked
 * @param chunkSize - the size of each chunk in bytes. If `0`, returns the
 * payload as is. If the given `chunkSize` will result in a single frame, the
 * payload is returned as is.
 * @yields - a chunk frame or the original payload if it fits within a single
 * frame
 */
export declare function toFrames<Payload extends Json>(payload: Payload, chunkSize: number): AsyncGenerator<TransportChunkFrame | Payload, void>;
