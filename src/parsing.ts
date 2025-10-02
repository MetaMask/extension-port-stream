/* eslint-disable no-plusplus, no-bitwise, no-mixed-operators */
// disabled these eslint rules because its very noisy in here with them:
// 1. We use a lot of no-plusplus and no-bitwise
// 2. no-mixed-operators doesn't work with code formatters, as they want opposite changes

import type { ChunkFrame, Final } from './types';

const XOR_ZERO = 48 as const; // Shifts characters codes down by 48 so "0" is  0

const PIPE_XZ = 76 as const; // Shifted "|"'s character code

/**
 * Maybe parses a {@link ChunkFrame} *from a string*.
 *
 * a chunk frame is in the form: `<id>|<seq>|<fin><data>`, where:
 * - `<id>` is a unique number identifier for the chunked message
 * - `<total>` is the total number of chunks in the message
 * - `<seq>` is the sequence number of this chunk (0-based)
 * - `<data>` is the actual data of this chunk
 *
 * The reason we can't just send a message like "hey I'm about to send some chunks"
 * then send the message itself in bits, and then send an "I'm done sending the
 * chunks" message is because of a combination of three factors:
 * 1) we need to send the chunks without blocking the thread for too long;
 * sending huge chunks can take several seconds.
 * 2) other parts of the system might _also_ send data over the same Port; so
 * frames would be intermingled.
 * 3) I couldn't find documentation guaranteeing that sent `runtime.Port`
 * messages are received in the order they are sent (hence the `seq`uence number we send)
 *
 * This function has been benchmarked and highly optimized, modify carefully.
 *
 * A Note:
 * The resulting *magnitudes* of the `id` and `seq` values aren't validated; we
 * are only checking that the *shape* of the message matches: `<digits>|<digits>|<0|1><data>`
 * and we _assume_ that the digits represent a number in the range <0, 2^31-1>,
 * per the design.
 *
 * While we could "fix" this with some checks, but it's not worth fixing, since
 * the problem at this point is really that something is spamming messages that
 * are in the *format* of a Chunk Frame, but... aren't actually Chunk Frames.
 * Since no message will contain this format on accident, I don't think it's
 * worth chasing.
 *
 * @param input - the string to parse
 * @param length - must be greater than 6, it is *not* validated within this
 * function; it is validated at the call-site instead.
 * @returns a {@link ChunkFrame} if the value is a valid chunk frame, otherwise null
 */
function maybeParseStringAsChunkFrame(
  input: string,
  length: number,
): ChunkFrame | null {
  // parse id
  let code = input.charCodeAt(0);
  let id = (code ^ XOR_ZERO) | 0;
  // first must be a digit
  if (id > 9) {
    return null;
  }
  let i = 1 | 0;
  for (;;) {
    if (i === length) {
      return null;
    }
    const d = (input.charCodeAt(i) ^ XOR_ZERO) | 0;
    if (d > 9) {
      // d isn't a digit (0-9)
      if (d === PIPE_XZ) {
        i++; // it's a "|"! We're done; skip the '|'.
        break;
      }
      return null;
    }
    i++;
    // we compute the id as we parse it from left to right.
    id = id * 10 + d;
  }

  if (i === length) {
    return null;
  }
  // parse seq
  code = input.charCodeAt(i);
  let seq = (code ^ XOR_ZERO) | 0;
  if (seq > 9) {
    return null;
  }
  i++;
  for (;;) {
    if (i >= length) {
      return null;
    }
    const d = (input.charCodeAt(i) ^ XOR_ZERO) | 0;
    if (d > 9) {
      if (d === PIPE_XZ) {
        i++; // it's a "|"! We're done; skip the '|'.
        break;
      }
      return null;
    }
    i++;
    // we compute the seq as we parse it from left to right.
    seq = seq * 10 + d;
  }

  if (i === length) {
    return null;
  }
  // parse fin
  const fin = ((input.charCodeAt(i) ^ XOR_ZERO) | 0) as Final;
  if (fin >>> 1 !== 0) {
    return null;
  }

  return { id, seq, fin, source: input, dataIndex: i + 1 };
}

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

export function maybeParseAsChunkFrame(input: unknown): ChunkFrame | null {
  if (typeof input !== 'string') {
    return null;
  }
  const { length } = input;
  // shortest legal message is: "0|0|1D" (6 characters)
  if (length < 6) {
    return null;
  }
  return maybeParseStringAsChunkFrame(input, length);
}
