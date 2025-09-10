import type { ChunkFrame } from './types';
/**
 * Maybe parses a {@link ChunkFrame}.
 *
 * a chunk frame is a string in the form: `<id>|<seq>|<fin><data>`, where:
 * - `<id>` is a unique number identifier for the chunked message
 * - `<total>` is the total number of chunks in the message
 * - `<seq>` is the sequence number of this chunk (0-based)
 * - `<data>` is the actual data of this chunk
 *
 * @param input - the value to try to parse
 * @returns a {@link ChunkFrame} if the value is a valid chunk frame, otherwise null
 */
export declare function maybeParseAsChunkFrame(input: unknown): ChunkFrame | null;
