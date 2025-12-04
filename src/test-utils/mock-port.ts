/* eslint-disable no-invalid-this */

import type { Runtime } from 'webextension-polyfill';
import { ExtensionPortStream } from '..';

/**
 * Mock Runtime.Port that simulates Chrome's behavior including size limits.
 */
export class MockPort implements Runtime.Port {
  public readonly name: string;

  private messageListeners: ((message: unknown, port: Runtime.Port) => void)[] =
  [];

  private disconnectListeners: ((port: Runtime.Port) => void)[] = [];

  private connectedPort: MockPort | null = null;

  private maxMessageSize: number;

  readonly expectedErrorMessage: string;

  private disconnected = false;

  /**
   *
   * @param name - The name of the port
   * @param maxMessageSize - The maximum message size in bytes (default 64MiB)
   * @param expectedErrorMessage - The expected error message when exceeding max size (for testing purposes)
   * Originally found here: https://source.chromium.org/chromium/chromium/src/+/main:extensions/renderer/api/messaging/messaging_util.cc;l=97
   */
  constructor(
    name: string,
    maxMessageSize: number = 64 * 1024 * 1024,
    expectedErrorMessage: string = ExtensionPortStream.ErrorMessages[0],
  ) {
    this.name = name;
    this.maxMessageSize = maxMessageSize;
    this.expectedErrorMessage = expectedErrorMessage;
  }

  postMessage = jest.fn((message: unknown): void => {
    if (this.disconnected) {
      throw new Error('Port disconnected');
    }

    // Simulate Chrome's size validation: JSON.stringify then measure bytes
    const serialized = JSON.stringify(message);
    const byteSize = new TextEncoder().encode(serialized).length;

    if (byteSize > this.maxMessageSize) {
      throw new Error(this.expectedErrorMessage);
    }

    if (this.connectedPort && !this.connectedPort.disconnected) {
      // Simulate async delivery
      queueMicrotask(() => {
        if (this.connectedPort && !this.connectedPort.disconnected) {
          const deserializedMessage = JSON.parse(serialized);
          this.connectedPort.receiveMessage(deserializedMessage, this);
        }
      });
    }
  });

  private receiveMessage(message: unknown, sender: Runtime.Port): void {
    this.messageListeners.forEach((listener) => listener(message, sender));
  }

  disconnect(): void {
    if (this.disconnected) {
      return;
    }

    this.disconnected = true;
    this.disconnectListeners.forEach((listener) => listener(this));
    this.disconnectListeners = [];

    if (this.connectedPort && !this.connectedPort.disconnected) {
      this.connectedPort.disconnect();
    }
  }

  onMessage = {
    addListener: jest.fn(
      (listener: (message: unknown, port: Runtime.Port) => void) => {
        this.messageListeners.push(listener);
      },
    ),
    removeListener: jest.fn(
      (listener: (message: unknown, port: Runtime.Port) => void) => {
        this.messageListeners = this.messageListeners.filter(
          (l) => l !== listener,
        );
      },
    ),
    hasListener: jest.fn(
      (listener: (message: unknown, port: Runtime.Port) => void) => {
        return this.messageListeners.includes(listener);
      },
    ),
    hasListeners: jest.fn(() => this.messageListeners.length > 0),
  };

  onDisconnect = {
    addListener: jest.fn((listener: (port: Runtime.Port) => void) => {
      this.disconnectListeners.push(listener);
    }),
    removeListener: jest.fn((listener: (port: Runtime.Port) => void) => {
      this.disconnectListeners = this.disconnectListeners.filter(
        (l) => l !== listener,
      );
    }),
    hasListener: jest.fn((listener: (port: Runtime.Port) => void) => {
      return this.disconnectListeners.includes(listener);
    }),
    hasListeners: jest.fn(() => this.disconnectListeners.length > 0),
  };

  // Internal method to connect two ports
  connectTo(otherPort: MockPort): void {
    this.connectedPort = otherPort;
    otherPort.connectedPort = this;
  }
}

/**
 * Create a connected pair of mock ports.
 */
export function createMockPortPair(
  maxMessageSize: number = 64 * 1024 * 1024,
  expectedErrorMessage: string = ExtensionPortStream.ErrorMessages[0],
): [portA: MockPort, portB: MockPort] {
  const portA = new MockPort('portA', maxMessageSize, expectedErrorMessage);
  const portB = new MockPort('portB', maxMessageSize, expectedErrorMessage);

  portA.connectTo(portB);

  return [portA, portB];
}
