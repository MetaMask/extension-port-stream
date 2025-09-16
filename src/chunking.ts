/* eslint-disable no-bitwise, no-plusplus, no-mixed-operators */

import type { Json } from '@metamask/utils';
import { type TransportChunkFrame } from './types';

const INT32_MAX = 0x7fffffff;

let _randomCounter = 0 | 0;

/**
 * Creates a random ID for chunked messages. Always <= Int32 max value.
 *
 * @returns a random number that can be used as an ID
 */
function getNextId(): number {
  // increment the counter and wrap around if it exceeds Int32 max value
  _randomCounter = (_randomCounter + 1) & INT32_MAX;
  return _randomCounter;
}

// half a "frame" (at 60 fps) per chunk, in milliseconds
const FRAME_BUDGET_MS = 1000 / 60 / 2;

/**
 * Yield control to allow other tasks to run. Uses scheduler.yield() if available
 * (modern browsers), otherwise falls back to setTimeout (older browsers).
 */
const tick = (() => {
  return globalThis.scheduler?.yield
    ? globalThis.scheduler.yield.bind(globalThis.scheduler)
    : async () => await new Promise<void>((resolve) => setTimeout(resolve, 0));
})();

/**
 * Compute the UTF-8 byte length for a single code point
 *
 * Uses code point ranges instead of `new TextEncoder().encode("x").byteLength`
 * for performance reasons.
 *
 * @param cp - the code point
 * @returns the UTF-8 byte length
 */
function utf8Len(cp: number): number {
  if (cp <= 0x7f) {
    // e.g., new TextEncoder().encode("x").byteLength === 1
    return 1;
  }
  if (cp <= 0x7ff) {
    // e.g., new TextEncoder().encode("¢").byteLength === 2
    return 2;
  }
  if (cp <= 0xffff) {
    // e.g., new TextEncoder().encode("✓").byteLength === 3
    return 3;
  }
  // e.g., new TextEncoder().encode("😀").byteLength === 4
  return 4;
}

/**
 * Finds the max cut index such that:
 * `bytes(JSON.stringify(s.slice(start, cut))) <= maxLength`
 *
 * We do this by starting with `used = 2`, then we add per-code-point costs for
 * the slice until we’d exceed maxLength.
 * @param json - the full JSON string
 * @param start - the starting index for the slice
 * @param maxBytes - the maximum allowed length in _bytes_
 */
function getJsonSliceIndex(json: string, start: number, maxBytes: number) {
  // Start with the overhead bytes that JSON.stringify will add (2 bytes for
  // the outer quotation marks)
  let bytesUsed = 2;

  let i = start;
  while (i < json.length) {
    const before = bytesUsed;

    // Use codePointAt to correctly handle multi-byte characters (like emojis)
    // that are represented by surrogate pairs in JavaScript strings.
    const cp = json.codePointAt(i) as number;
    // A code point > 0xFFFF is a "wide" character, taking up two 16-bit
    // code units in a JavaScript string (a surrogate pair).
    const codeUnits = cp > 0xffff ? 2 : 1;

    // A quote (") or backslash (\) is escaped by JSON.stringify,
    // turning one character into two bytes (e.g., `\"` or `\\`).
    if (cp === 0x22 || cp === 0x5c) {
      bytesUsed += 2;
    } else {
      // For all other characters, add their standard UTF-8 byte length.
      bytesUsed += utf8Len(cp);
    }

    if (bytesUsed > maxBytes) {
      // The last code point made us exceed the max size. We can't include it.
      // The loop will terminate, and `i` will point to the start of this
      // code point, effectively excluding it from the slice.
      bytesUsed = before;
      break;
    }
    // Advance the index by the number of 16-bit units this code point used.
    i += codeUnits;
  }

  return i;
}

/**
 * Converts a JSON object into an async generator of chunk frames.
 *
 * We use an async generator in order to allow other tasks to complete while
 * the chunking is happening.
 *
 * Chunks the payload at character boundaries, and is aware of "wide" characters
 * like 😀 (U+1F600) which is 4 UTF-8 bytes, but only 2 JS String#length
 * characters. It never splits across a surrogate pair boundary (i.e., never
 * splits a single Unicode code point).
 *
 * @param payload - the payload to be chunked
 * @param chunkSize - the size of each chunk in bytes. If `0`, returns the
 * payload as is. If the given `chunkSize` will result in a single frame, the
 * payload is returned as is.
 * @yields - a chunk frame or the original payload if it fits within a single
 * frame
 */

export async function * toFrames<Payload extends Json>(
  payload: Payload,
  chunkSize: number,
): AsyncGenerator<TransportChunkFrame | Payload, void> {
  let begin = performance.now();
  const json = JSON.stringify(payload);
  const payloadLength = json.length;

  // we need to leave space for our header
  const id = getNextId();
  let index = 0;
  let seq = 0;

  do {
    if (performance.now() - begin >= FRAME_BUDGET_MS) {
      // prevent background processing from locking up for too long by allowing
      // other macro tasks to perform work between chunks
      await tick();
      begin = performance.now();
    }
    const header = `${id}|${seq}|` as const;
    const headerSize = header.length + 1; // +1 for fin
    const dataMaxLength = chunkSize - headerSize;

    const remainingLen = payloadLength - index;
    let end: number;

    // Check if the rest of the string is guaranteed to fit.
    // We use a conservative upper bound: assume each remaining UTF‑16 code unit
    // costs 4 bytes in JSON.stringify(frame), plus 2 outer quotes for the whole
    // frame. This overestimates (non‑BMP code points are 4 bytes but span 2
    // code units; ASCII is 1 byte; quotes/backslashes are 2 bytes), so if this
    // bound fits, the actual bytes will fit as well.
    if (remainingLen * 3 + 2 <= dataMaxLength) {
      // If the max possible size of the remainder fits, take it all and skip
      // the very expensive `getJsonSliceIndex` call.
      end = payloadLength;
    } else {
      // Otherwise, do the detailed calculation.
      end = getJsonSliceIndex(json, index, dataMaxLength);
    }

    const fin = end === payloadLength ? 1 : 0;
    const frame: TransportChunkFrame = `${header}${fin}${json.slice(
      index,
      end,
    )}`;
    yield frame;

    index = end;
    seq++;
  } while (index < payloadLength);
}
