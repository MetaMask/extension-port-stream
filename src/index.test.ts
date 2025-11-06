/* eslint-disable node/global-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, no-var */

import { createMockPortPair } from './test-utils/mock-port';
import { MIN_CHUNK_SIZE } from './constants';
import { ExtensionPortStream } from '.';
// eslint-disable-next-line import/no-unassigned-import
import '../global.d.ts';

describe('ExtensionPortStream', () => {
  function init({
    chunkSize,
    maxMessageSize,
    Constructor = ExtensionPortStream,
    expectedErrorMessage = ExtensionPortStream.ErrorMessages[0],
  }: {
    chunkSize: number;
    maxMessageSize?: number;
    Constructor?: typeof ExtensionPortStream;
    expectedErrorMessage?: (typeof ExtensionPortStream.ErrorMessages)[number];
  }) {
    const [bgPort, uiPort] = createMockPortPair(
      maxMessageSize ?? chunkSize,
      expectedErrorMessage,
    );
    const bgPortStream = new Constructor(bgPort, {
      chunkSize,
    });
    const uiPortStream = new Constructor(uiPort, {
      chunkSize,
    });
    return {
      bgPort,
      uiPort,
      bgPortStream,
      uiPortStream,
    };
  }

  /**
   * Generates a payload of given JSON.stringified _byte_ size
   *
   * @param size
   * @returns
   */
  function generatePayload(size: number) {
    if (size < 2) {
      throw new Error('Impossible size');
    }
    // JSON quotes
    const JSONQuotes = 2;
    return 'x'.repeat(size - JSONQuotes);
  }

  /**
   *
   * @param stream
   * @param message
   */
  async function sendMessage(stream: ExtensionPortStream, message: any) {
    const obj = {
      messageTooLarge: false,
      error: null as any,
    };
    stream.on('error', () => {
      // swallow errors, as we capture them in our callback
    });
    stream.on('message-too-large', (data) => {
      if (message === data.message) {
        obj.messageTooLarge = true;
      }
    });
    try {
      await new Promise<void>((resolve, reject) => {
        stream.write(message, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (e) {
      obj.error = e;
    }
    return obj;
  }

  describe('basic tests', () => {
    it('exports the CHUNK_SIZE from the index file', () => {
      const { CHUNK_SIZE } = require('.');
      expect(typeof CHUNK_SIZE).toBe('number');
    });

    it('sets CHUNK_SIZE to 0 for Firefox', () => {
      jest.isolateModules(() => {
        // Mock navigator.userAgent before importing constants
        const originalUserAgent = globalThis.navigator?.userAgent;
        Object.defineProperty(globalThis.navigator, 'userAgent', {
          value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          configurable: true,
        });

        // Import constants after navigator is mocked
        const { CHUNK_SIZE: firefoxChunkSize } = require('./constants');

        expect(firefoxChunkSize).toEqual(0);

        // Restore original userAgent
        if (originalUserAgent !== undefined) {
          Object.defineProperty(globalThis.navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true,
          });
        }
      });
    });

    it('uses the default CHUNK_SIZE if none is given', () => {
      const { CHUNK_SIZE } = require('.');
      const { bgPort } = init(CHUNK_SIZE);
      const stream = new ExtensionPortStream(bgPort);
      expect(stream.getChunkSize()).toEqual(CHUNK_SIZE);
    });

    it('sets CHUNK_SIZE to 64MB for non-Firefox browsers', () => {
      jest.isolateModules(() => {
        // Mock navigator.userAgent before importing constants
        const originalUserAgent = globalThis.navigator?.userAgent;
        Object.defineProperty(globalThis.navigator, 'userAgent', {
          value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          configurable: true,
        });

        // Import constants after navigator is mocked
        const { CHUNK_SIZE: chromeChunkSize } = require('./constants');

        expect(chromeChunkSize).toEqual(67108864); // 64MB

        // Restore original userAgent
        if (originalUserAgent !== undefined) {
          Object.defineProperty(globalThis.navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true,
          });
        }
      });
    });

    it('can set the logger', async () => {
      const { bgPort } = init({ chunkSize: 128 });
      const logger1 = jest.fn();
      const logger2 = jest.fn();
      const stream = new ExtensionPortStream(bgPort, {
        chunkSize: 128,
        log: logger1,
      });
      await new Promise((resolve) => stream.write('test 1', resolve));
      expect(logger1).toHaveBeenCalledWith('test 1', true);
      expect(logger2).not.toHaveBeenCalledWith('test 2', true);

      stream.setLogger(logger2);
      await new Promise((resolve) => stream.write('test 2', resolve));
      // second logger isn used now
      expect(logger2).toHaveBeenCalledWith('test 2', true);
      // first logger isn't used
      expect(logger1).not.toHaveBeenCalledWith('test 2', true);
    });

    it('chunking enabled, small message, does not chunk', async () => {
      const { bgPortStream, uiPortStream } = init({ chunkSize: 128 });

      const message = generatePayload(128);

      const result = await sendMessage(bgPortStream, message);
      const data = await new Promise((resolve) => uiPortStream.on('data', resolve));
      expect(JSON.stringify(data)).toEqual(JSON.stringify(message));
      expect(result.error).toBeNull();
      expect(result.messageTooLarge).toEqual(false);
    });

    it('chunking enabled, large message, does chunk', async () => {
      const { bgPortStream, uiPortStream } = init({ chunkSize: 128 });

      const message = generatePayload(129); // too big

      const result = await sendMessage(bgPortStream, message);
      const data = await new Promise((resolve) => uiPortStream.on('data', resolve));
      expect(JSON.stringify(data)).toEqual(JSON.stringify(message));
      expect(result.error).toBeNull();
      expect(result.messageTooLarge).toEqual(true);
    });

    it('chunking disabled, small message, does not chunk', async () => {
      const { bgPortStream, uiPortStream } = init({
        chunkSize: 0,
        maxMessageSize: 128,
      }); // no chunking

      const message = generatePayload(128);

      const result = await sendMessage(bgPortStream, message);
      const data = await new Promise((resolve) => uiPortStream.on('data', resolve));
      expect(JSON.stringify(data)).toEqual(JSON.stringify(message));
      expect(result.error).toBeNull();
      expect(result.messageTooLarge).toEqual(false);
    });

    it('chunking disabled, large message, does not chunk (it fails)', async () => {
      const { bgPortStream } = init({ chunkSize: 0, maxMessageSize: 128 }); // no chunking

      const message = generatePayload(129); // too big

      const result = await sendMessage(bgPortStream, message);
      expect(result.error).not.toBeNull();
      expect(result.messageTooLarge).toEqual(true);
    });

    describe('scheduler', () => {
      // scheduler.yield available or not (true, false)
      it.each([true, false])(
        'yields due to slow frame generation (scheduler.yield: %s)',
        async (useYield) => {
          await jest.isolateModulesAsync(async () => {
            // Mock performance.now to simulate slow frame generation
            const mockPerformanceNow = jest.fn();
            let timeCounter = 0;
            // if you comment this out the tests will fail, because
            // chunking won't actually happen and the scheduler won't be used
            mockPerformanceNow.mockImplementation(() => {
              // Return increasing time values to simulate slow processing
              // FRAME_BUDGET is ~8.33ms, so we need to exceed this between chunks
              return (timeCounter += 10);
            });

            // Create a mock scheduler.yield function that we can spy on
            const mockYield = jest.fn(() => {
              // it simulates async yield by waiting until the next *macrotask*
              return new Promise<void>((resolve) => setTimeout(resolve, 0));
            });
            const originalScheduler = globalThis.scheduler;
            if (useYield) {
              globalThis.scheduler = {
                yield: mockYield,
              };
            } else {
              // force fallback (setTimeout)
              globalThis.scheduler = undefined;
            }

            // Replace the global performance.now with our mock
            const originalPerformanceNow = global.performance.now;
            Object.defineProperty(global.performance, 'now', {
              value: mockPerformanceNow,
              configurable: true,
            });

            try {
              const chunkSize = 128; // Small chunk size to force multiple chunks
              const { bgPortStream, uiPortStream } = init({
                chunkSize,
                Constructor: require('.').ExtensionPortStream,
              });

              // Create a large message that will require multiple chunks
              const message = generatePayload(chunkSize * 2);

              // Queue up a new macrotask that will be yielded to during the
              // sendMessage `chunking` operations
              const raceProm = new Promise((resolve) => {
                setTimeout(() => resolve('race'), 0);
              });
              const resultProm = sendMessage(bgPortStream, message);
              // Wait for either the message to be sent or a timeout (to prevent hanging tests)
              const dataProm = new Promise((resolve) => uiPortStream.on('data', resolve));
              const raceResult = await Promise.race([raceProm, dataProm]);
              const result = await resultProm;
              const data = await dataProm;

              expect(raceResult).toEqual('race');

              // Verify the message was chunked and reconstructed correctly
              expect(JSON.stringify(data)).toEqual(JSON.stringify(message));
              expect(result.error).toBeNull();
              expect(result.messageTooLarge).toEqual(true);

              // Verify that scheduler.yield was called (indicating yielding occurred)
              if (useYield) {
                expect(mockYield).toHaveBeenCalled();
              } else {
                expect(mockYield).not.toHaveBeenCalled();
              }

              // Verify performance.now was called multiple times
              expect(mockPerformanceNow).toHaveBeenCalled();
              expect(mockPerformanceNow.mock.calls.length).toBeGreaterThan(1);
            } finally {
              // Restore original performance.now and scheduler
              Object.defineProperty(global.performance, 'now', {
                value: originalPerformanceNow,
                configurable: true,
              });
              globalThis.scheduler = originalScheduler;
            }
          });
        },
      );
    });
  });

  describe('parsing', () => {
    it("doesn't attempt to parse non-strings as chunk frames", async () => {
      const { bgPort, uiPortStream } = init({ chunkSize: 128 });
      const prom = new Promise((resolve) => uiPortStream.on('data', resolve));
      bgPort.postMessage(123);
      await expect(prom).resolves.toEqual(123);
    });

    it('parses very short string without error (shorter than smallest legal chunk frame)', async () => {
      const { bgPort, uiPortStream } = init({ chunkSize: 128 });
      const prom = new Promise((resolve) => uiPortStream.on('data', resolve));
      bgPort.postMessage('12345');
      await expect(prom).resolves.toEqual('12345');
    });

    it('handles strings that are _almost_ chunk frames without issue', async () => {
      const testStrings = [
        'a|0|1data', // a is not an id
        '1|0|data', // missing fin
        '1|a|1data', // a is not a seq
        '1|0|2data', // 2 is not a fin
        '1||1data', // missing seq
        '|0|1data', // missing id
        '||data', // missing all
        '001data', // missing pipes
        '00|1data', // missing id|seq pipe
        '0|01data', // missing seq|fin pipe
        '123456', // long enough, but missing |seq|fin
        '123456|', // long enough, but missing seq|fin
        '1|1234', // long enough, but missing |fin
        '1|1234|', // long enough, but missing |fin
      ];
      await Promise.all(
        testStrings.map(async (str) => {
          const { bgPort, uiPortStream } = init({ chunkSize: 128 });
          const prom = new Promise((resolve) => uiPortStream.on('data', resolve));
          bgPort.postMessage(str);
          await expect(prom).resolves.toEqual(str);
        }),
      );
    });
    it('handles raw valid chunk frames', async () => {
      const { bgPort, uiPortStream } = init({ chunkSize: 128 });
      const prom = new Promise((resolve) => uiPortStream.on('data', resolve));
      bgPort.postMessage('0|0|1"data"');
      await expect(prom).resolves.toEqual('data');
    });
  });

  describe('errors', () => {
    it('validates chunkSize', () => {
      expect(
        () => new ExtensionPortStream({} as any, { chunkSize: -1 }),
      ).toThrow(
        `Cannot chunk messages smaller than the min chunk size, ${MIN_CHUNK_SIZE}`,
      );
    });

    it('emits error on bad data', async () => {
      const { bgPortStream } = init({ chunkSize: 128 });

      const message = { message: {} };
      // a circular ref can't be JSON serialized and will cause `port.postMessage`
      // to fail
      message.message = message;

      const result = await sendMessage(bgPortStream, message);
      expect(result.error).toBeInstanceOf(AggregateError);
      expect(result.error.message).toEqual(
        'ExtensionPortStream postMessage failed',
      );
      expect(result.messageTooLarge).toEqual(false);
    });

    it("doesn't allow non-utf8 encodings", async () => {
      const { bgPortStream } = init({ chunkSize: 128 });

      const message = generatePayload(128);
      bgPortStream.on('error', () => {
        // ignored as we handle it in the callback.
      });
      const result = await new Promise<{ error: Error }>((resolve) => bgPortStream.write(message, 'ascii', (err) => {
        resolve({ error: err as Error });
      }));
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toEqual(
        'ExtensionPortStream only supports UTF-8 encoding',
      );
    });

    it('emits port.postMessage error of type `unknown`', async () => {
      const { bgPortStream, bgPort } = init({ chunkSize: 128 });

      bgPort.postMessage.mockImplementationOnce(() => {
        // throw something weird. impossible in the real world as browser
        // internals will only throw real errors, but we have a branch for it and
        // it is easy to test so here we are
        throw Symbol("Don't throw weird stuff");
      });

      const result = await sendMessage(bgPortStream, generatePayload(128));
      expect(result.error).toBeInstanceOf(AggregateError);
      expect(result.error.message).toEqual(
        'ExtensionPortStream postMessage failed',
      );
      expect(result.error.errors).toEqual([
        new Error("Symbol(Don't throw weird stuff)"),
      ]);
      expect(result.messageTooLarge).toEqual(false);
    });

    it.each(ExtensionPortStream.ErrorMessages)(
      'emits "%s" error from postMessage failure while chunking',
      async (expectedErrorMessage) => {
        const { bgPortStream, bgPort } = init({
          chunkSize: 128,
          expectedErrorMessage,
        });
        const simulatedError = new Error('Simulated port.postMessage Failure');
        bgPort.postMessage
          .mockImplementationOnce(() => {
            // force the chunking path
            throw new Error(bgPort.expectedErrorMessage);
          })
          .mockImplementationOnce(() => {
            // force the error handling path within chunking
            throw simulatedError;
          });
        const result = await sendMessage(bgPortStream, generatePayload(128));
        expect(result.error).toBeInstanceOf(AggregateError);
        expect(result.error.message).toEqual(
          'ExtensionPortStream chunked postMessage failed',
        );
        expect(result.error.errors).toEqual([simulatedError]);
        expect(result.messageTooLarge).toEqual(true);
      },
    );
  });

  describe('early-fit fast path bound', () => {
    it('hits equality: remainingLen*3 + 2 === dataMaxLength (chunkSize=64) on the final chunk', async () => {
      await jest.isolateModulesAsync(async () => {
        const chunkSize = 64; // bytes
        const characters = 36;
        const payload = '✓'.repeat(characters); // BMP 3-byte chars

        // sanity check: unchunked byte size > maxMessageSize to force chunking
        const unchunkedBytes = new TextEncoder().encode(
          JSON.stringify(payload),
        ).length;
        expect(unchunkedBytes).toBe(
          2 /* quotes*/ + (3 /* max byte length*/ * characters),
        ); // 110, leaving 18 bytes for 2 sets of headers and escapes

        // set up a port stream that triggers chunking
        const { bgPortStream, uiPortStream, bgPort } = init({
          chunkSize,
          // Fresh module state so id starts at 1
          Constructor: require('.').ExtensionPortStream,
        });

        // kick off the write
        const resultPromise = sendMessage(bgPortStream, payload);
        const data = await new Promise((resolve) => uiPortStream.on('data', resolve));
        // payload reconstructed correctly
        expect(data).toEqual(payload);

        const result = await resultPromise;
        // result as expected
        expect(result.error).toBeNull();
        expect(result.messageTooLarge).toBe(true);

        // Calls:
        // 1) initial unchunked send (throws due to size)
        // 2) first frame (seq 0, fin 0)
        // 3) second frame (seq 1, fin 1)-  hits our fast path at its max size
        expect(bgPort.postMessage).toHaveBeenCalledTimes(3);

        // inspect the two _frame_ sends
        const frame1 = bgPort.postMessage.mock.calls[1][0] as string;
        const frame2 = bgPort.postMessage.mock.calls[2][0] as string;
        // the byte size of the first frame should be _exactly_ the chunk size
        const frame1Bytes = new TextEncoder().encode(frame1).length;
        // -4 for because _internally_ quotation marks are added AND escaped
        expect(frame1Bytes).toBe(chunkSize - 4);
        // the byte size of the second frame should be _exactly_ the chunk size
        const frame2Bytes = new TextEncoder().encode(frame2).length;
        // -4 for because _internally_ quotation marks are added AND escaped
        expect(frame2Bytes).toBe(chunkSize - 4);

        // santiy checkcheck the frame headers: id=1, seq=0/1, fin=0/1
        expect(frame1.startsWith('1|0|0')).toBe(true);
        expect(frame2.startsWith('1|1|1')).toBe(true);

        // the entire payload is the original json string + quotation marks
        const json = JSON.stringify(payload);
        expect(json.length).toBe(characters + 2);
      });
    });
  });

  describe('character JSON stringified byte lengths', () => {
    // Comprehensive character-by-character testing
    const generateCharacterTests = (): {
      char: string;
      description: string;
      expectedUtf8Bytes: number;
    }[] => {
      const testCases: {
        char: string;
        description: string;
        expectedUtf8Bytes: number;
      }[] = [];

      // ASCII characters (0x00-0x7F) - 1 UTF-8 byte each
      for (let cp = 0x00; cp <= 0x7f; cp++) {
        // handle backslash and quotes as 2 bytes
        if (cp === 0x22 || cp === 0x5c) {
          testCases.push({
            char: String.fromCharCode(cp),
            description: `escaped-${cp.toString(16).padStart(2, '0')}`,
            expectedUtf8Bytes: 2,
          });
          continue;
        }

        const char = String.fromCharCode(cp);

        let desc: string;
        if (cp <= 0x1f) {
          // Control characters
          desc = `control-${cp.toString(16).padStart(2, '0')}`;
        } else if (cp === 0x7f) {
          // Delete
          desc = 'del';
        } else if (cp >= 0x20 && cp <= 0x7e) {
          // ASCII characters
          desc = `ascii-${char}`;
        } else {
          // Extended ASCII
          desc = `ascii-${cp.toString(16)}`;
        }

        testCases.push({ char, description: desc, expectedUtf8Bytes: 1 });
      }

      // Latin-1 Supplement (0x80-0xFF) - 2 UTF-8 bytes each
      for (let cp = 0x80; cp <= 0xff; cp++) {
        const char = String.fromCharCode(cp);
        testCases.push({
          char,
          description: `latin1-${cp.toString(16)}`,
          expectedUtf8Bytes: 2,
        });
      }

      // Sample from Basic Multilingual Plane - 3 UTF-8 bytes each
      const bmpSamples: [number, string][] = [
        [0x0100, 'latin-ext-a'], // Ā
        [0x0370, 'greek'], // Ͱ
        [0x0400, 'cyrillic'], // Ѐ
        [0x2028, 'line-sep'],
        [0x2029, 'para-sep'],
        [0x4e00, 'cjk'], // 一
        // surrogates usually come in pairs, but don't have to
        [0xd800, 'high-surrogate'], // (lone high surrogate)
        [0xdc00, 'low-surrogate'], // (lone low surrogate)
      ];

      for (const [cp, name] of bmpSamples) {
        const char = String.fromCharCode(cp);
        // Determine actual UTF-8 byte length
        const actualUtf8Bytes = Buffer.from(char, 'utf8').length;
        testCases.push({
          char,
          description: `${name}-${cp.toString(16)}`,
          expectedUtf8Bytes: actualUtf8Bytes,
        });
      }

      // Supplementary Planes - 4 UTF-8 bytes each
      const suppSamples: [number, string][] = [
        [0x1f98a, 'emoji-fox'], // 🦊
        [0x1f680, 'emoji-rocket'], // 🚀
        [0x10400, 'deseret'], // 𐐀
      ];

      for (const [cp, name] of suppSamples) {
        const char = String.fromCodePoint(cp);
        testCases.push({
          char,
          description: `${name}-${cp.toString(16)}`,
          expectedUtf8Bytes: 4,
        });
      }

      return testCases;
    };

    it.each(generateCharacterTests())(
      'handles $description correctly (expecting $expectedUtf8Bytes UTF-8 bytes)',
      async ({ char, expectedUtf8Bytes }) => {
        const chunkSize = 1024;
        const { bgPortStream, uiPortStream } = init({ chunkSize });

        // Create message large enough to force chunking (> chunkSize)
        // We need the JSON.stringify result to exceed chunkSize in UTF-8 bytes
        // JSON adds 2 bytes for quotes, then each character contributes bytesPerCharInJson
        const charsNeeded = Math.ceil((chunkSize - 2) / expectedUtf8Bytes) + 1;
        const message = char.repeat(charsNeeded);

        const result = await sendMessage(bgPortStream, message);
        const data = await new Promise((resolve) => uiPortStream.on('data', resolve));

        expect(data).toEqual(message);
        expect(result.error).toBeNull();
        expect(result.messageTooLarge).toEqual(true);
      },
    );
  });

  describe('disconnect', () => {
    it('handles disconnection gracefully', async () => {
      const chunkSize = 1024;
      const { bgPortStream, uiPortStream, uiPort } = init({ chunkSize });

      // Simulate disconnections
      const bgProm = new Promise((resolve) => bgPortStream.on('close', resolve));
      const uiProm = new Promise((resolve) => uiPortStream.on('close', resolve));
      // if either port goes away they will both throw disconnection errors
      uiPort.disconnect();

      await expect(bgProm).resolves.toEqual(undefined);
      await expect(uiProm).resolves.toEqual(undefined);
    });
  });
});
