# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.0.1]

### Fixed

- handle chrome's new error message-too-large error message, coming in a future chrome release ([#83](https://github.com/MetaMask/extension-port-stream/pull/83))
- don't throw when upstream port disconnects ([#82](https://github.com/MetaMask/extension-port-stream/pull/82))

### Changed

- chore: update security-code-scanner@main to action-security-code-scanner@v1 ([#67](https://github.com/MetaMask/extension-port-stream/pull/67))
- Add allow-scripts (+ preinstall-always-fail) ([#80](https://github.com/MetaMask/extension-port-stream/pull/80))

## [5.0.0]

### Changed

- **BREAKING:** Chunk large port stream messages into smaller frames by default ([#68](https://github.com/MetaMask/extension-port-stream/pull/68))

  - By default, `ExtensionPortStream` will send messages in 64MB chunks on Chromium-based browsers. When this mode is used the receiving end must also use `ExtensionPortStream` in its default mode:

    ```javascript
    import { ExtensionPortStream } from "extension-port-stream";

    extension.runtime.onConnect.addListener(connectRemote);
    const portStream = new ExtensionPortStream(remotePort, {
      chunkSize: 0, // disable chunking
    });

    // Enjoy!
    ```

  - To disable chunking set the `chunkSize` option to `0`. This will make the transport
    mostly backwards compatible with v4:
    `javascript
import { ExtensionPortStream } from "extension-port-stream";
extension.runtime.onConnect.addListener(connectRemote);
const portStream = new ExtensionPortStream(remotePort, {
  chunkSize: 0, // disable chunking
});
// Enjoy!
`
  - `message-too-large` is emitted when a message is too large to send in a single `postMessage` call and needs to be chunked. This event is only emitted when chunking is enabled (default).

- **BREAKING:** Node.js-style `Buffer` messages are no longer supported ([#68](https://github.com/MetaMask/extension-port-stream/pull/68))

## [4.2.0]

### Changed

- Allow overriding Duplex stream constructor options ([#59](https://github.com/MetaMask/extension-port-stream/pull/59))

## [4.1.0]

### Added

- Add named export of `PortDuplexStream` in addition to existing default export ([#57](https://github.com/MetaMask/extension-port-stream/pull/57))

## [4.0.0]

### Fixed

- **BREAKING**: `webextension-polyfill` is now a peer-dependency rather than a dependency. Users are expected to provide the runtime. ([#54](https://github.com/MetaMask/extension-port-stream/pull/54))
- `webextension-polyfill` import changed to type-only import ([#54](https://github.com/MetaMask/extension-port-stream/pull/54))

## [3.0.0]

### Changed

- **BREAKING**: Use portable `readable-stream@^3.6.2` instead of native streams ([#51](https://github.com/MetaMask/extension-port-stream/pull/51))

## [2.1.1]

### Changed

- deps: replace webextension-polyfill-ts with webextension-polyfill ([#43](https://github.com/MetaMask/extension-port-stream/pull/43))

## [2.1.0] - 2023-06-15

### Added

- `_setLogger` method can be used to inject custom logger for incoming/outgoing messages ([#46](https://github.com/MetaMask/extension-port-stream/pull/46))

### Changed

- deps: webextension-polyfill-ts@0.22.0->0.26.0 ([#37](https://github.com/MetaMask/extension-port-stream/pull/37))
  - Updates webextension-polyfill from 0.7.0 to 0.8.0

### Fixed

- Fix exporting of types ([#24](https://github.com/MetaMask/extension-port-stream/pull/24))
- deps: webextension-polyfill-ts@0.22.0->0.26.0 ([#37](https://github.com/MetaMask/extension-port-stream/pull/37))
  - Updates webextension-polyfill from 0.7.0 to 0.8.0

## [2.0.1] - 2021-04-29

### Changed

- Move `webextension-polyfill-ts` from `devDependencies` to `dependencies` ([#11](https://github.com/MetaMask/extension-port-stream/pull/11))

## [2.0.0] - 2020-11-23

### Added

- TypeScript typings ([#4](https://github.com/MetaMask/extension-port-stream/pull/4))

### Removed

- **(BREAKING)** Remove `readable-stream` dependency ([#4](https://github.com/MetaMask/extension-port-stream/pull/4))
  - Consumers using this package in browser environments will have to bring their own Node.js stream polyfill.

[Unreleased]: https://github.com/MetaMask/extension-port-stream/compare/v5.0.1...HEAD
[5.0.1]: https://github.com/MetaMask/extension-port-stream/compare/v5.0.0...v5.0.1
[5.0.0]: https://github.com/MetaMask/extension-port-stream/compare/v4.2.0...v5.0.0
[4.2.0]: https://github.com/MetaMask/extension-port-stream/compare/v4.1.0...v4.2.0
[4.1.0]: https://github.com/MetaMask/extension-port-stream/compare/v4.0.0...v4.1.0
[4.0.0]: https://github.com/MetaMask/extension-port-stream/compare/v3.0.0...v4.0.0
[3.0.0]: https://github.com/MetaMask/extension-port-stream/compare/v2.1.1...v3.0.0
[2.1.1]: https://github.com/MetaMask/extension-port-stream/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/MetaMask/extension-port-stream/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/MetaMask/extension-port-stream/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/MetaMask/extension-port-stream/releases/tag/v2.0.0
