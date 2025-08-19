import type { Json } from '@metamask/utils';
import type { DuplexOptions } from 'readable-stream';

/**
 * Data emitted with the 'message-too-large' event.
 */
export interface MessageTooLargeEventData {

  /**
   * The message that was too large to send in one postMessage.
   */
  message: Json;

  /**
   * The chunk size that will be used for chunking.
   */
  chunkSize: number;

  /**
   * The original error that was thrown when trying to send the message.
   */
  originalError: Error;
}

/**
 * A function to log messages.
 *
 * @param data - the data to log
 * @param outgoing - whether the data is outgoing (true) or incoming (false)
 */
export type Log = (data: unknown, outgoing: boolean) => void;

/**
 * Options for the ExtensionPortStream.
 *
 * @property log - a function to log messages
 * @property chunkSize - the size of each chunk in bytes
 */
export type Options = {
  log?: Log;

  /**
   * The size of each chunk in bytes. Set to 0 to disabled chunking.
   */
  chunkSize?: number;
} & DuplexOptions;

/**
 * Represents a queued chunked message.
 */
export interface QueuedEntry {

  /**
   * The parts of the chunked message.
   */
  parts: [source: string, dataIndex: number][];

  /**
   * The total number of chunks in the message.
   */
  expected: number;
}
export type Id = number;
type Seq = number;
export type Final = 0 | 1;
type Data = string;

/**
 * A parsed chunk of a {@link TransportChunkFrame} message.
 */
export interface ChunkFrame {
  id: Id;
  seq: Seq;
  fin: Final;
  source: string;
  dataIndex: number;
}

/**
 * A transport frame that represents a chunked message.
 *
 * @property id - a unique identifier for the chunked message
 * @property seq - the sequence number of this chunk
 * @property final - if this is the last packet
 * @property data - the actual data of this chunk
 */

export type TransportChunkFrame = `${Id}|${Seq}|${Final}${Data}`;
