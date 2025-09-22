# Extension Port Stream

A module for creating a Node-style stream over a WebExtension [Runtime.Port](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port) object.

## Breaking changes from v4 to v5

1. Chunking mode is enabled by default (see the [Usage](#usage) section below).
2. Node.js-style `Buffer` messages are no longer supported.

Additionally, the timing of logging, errors, and callbacks may be handled differently.

## Usage

By default, `ExtensionPortStream` will send messages in 64MB chunks on Chromium-based browsers.
When this mode is used the receiving end must also use `ExtensionPortStream` in its default mode.

```javascript
import { ExtensionPortStream } from "extension-port-stream";

extension.runtime.onConnect.addListener(connectRemote);
const portStream = new ExtensionPortStream(remotePort, {
  chunkSize: 0, // disable chunking
});

// Enjoy!
```

To disable chunking set the `chunkSize` option to `0`. This will make the transport
mostly backwards compatible with v4.

```javascript
import { ExtensionPortStream } from "extension-port-stream";

extension.runtime.onConnect.addListener(connectRemote);
const portStream = new ExtensionPortStream(remotePort, {
  chunkSize: 0, // disable chunking
});

// Enjoy!
```

### Events

`ExtensionPortStream` extends Node.js `Duplex` stream, so it inherits all EventEmitter capabilities. Additionally, it emits the following custom events:

#### `message-too-large`

Emitted when a message is too large to send in a single `postMessage` call and needs to be chunked. This event is only emitted when chunking is enabled (default).

```javascript
import {
  ExtensionPortStream,
  MessageTooLargeEventData,
} from "extension-port-stream";

const portStream = new ExtensionPortStream(remotePort);

portStream.on("message-too-large", (data: MessageTooLargeEventData) => {
  console.log(
    `Message too large (${
      JSON.stringify(data.message).length
    } bytes), chunking into ${data.chunkSize}-byte pieces`
  );
  console.log("Original error:", data.originalError.message);
});
```

## Running tests

```bash
yarn test
```
