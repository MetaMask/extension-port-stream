import type { DuplexOptions } from 'readable-stream';

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
 * @property debug - whether to enable debug mode
 * @property chunkSize - the size of each chunk in bytes
 */
export type Options = {
  log?: Log;
} & DuplexOptions;