# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.2]
### Uncategorized
- Revert "Update CHANGELOG.md (#39)" ([#39](https://github.com/MetaMask/extension-port-stream/pull/39))
- ci: fix publish-release job ([#40](https://github.com/MetaMask/extension-port-stream/pull/40))
- Update CHANGELOG.md ([#39](https://github.com/MetaMask/extension-port-stream/pull/39))
- ci: action-create-release-pr update; convert to manual trigger ([#38](https://github.com/MetaMask/extension-port-stream/pull/38))
- deps: webextension-polyfill-ts@0.22.0->0.26.0 ([#37](https://github.com/MetaMask/extension-port-stream/pull/37))
- Bump minimist from 1.2.5 to 1.2.8 ([#29](https://github.com/MetaMask/extension-port-stream/pull/29))
- Bump minimatch from 3.0.4 to 3.1.2 ([#34](https://github.com/MetaMask/extension-port-stream/pull/34))
- Bump hosted-git-info from 2.8.8 to 2.8.9 ([#35](https://github.com/MetaMask/extension-port-stream/pull/35))
- Bump path-parse from 1.0.6 to 1.0.7 ([#32](https://github.com/MetaMask/extension-port-stream/pull/32))
- Bump json5 from 1.0.1 to 1.0.2 ([#30](https://github.com/MetaMask/extension-port-stream/pull/30))
- Bump glob-parent from 5.1.1 to 5.1.2 ([#31](https://github.com/MetaMask/extension-port-stream/pull/31))
- Bump lodash from 4.17.20 to 4.17.21 ([#36](https://github.com/MetaMask/extension-port-stream/pull/36))
- Bump ansi-regex from 4.1.0 to 4.1.1 ([#33](https://github.com/MetaMask/extension-port-stream/pull/33))
- Fix default export ([#24](https://github.com/MetaMask/extension-port-stream/pull/24))
- Update CHANGELOG.md ([#21](https://github.com/MetaMask/extension-port-stream/pull/21))
- Add prepublishOnly ([#20](https://github.com/MetaMask/extension-port-stream/pull/20))

## [2.0.1] - 2021-04-29
### Changed
- Move `webextension-polyfill-ts` from `devDependencies` to `dependencies` ([#11](https://github.com/MetaMask/extension-port-stream/pull/11))

## [2.0.0] - 2020-11-23
### Added
- TypeScript typings ([#4](https://github.com/MetaMask/extension-port-stream/pull/4))

### Removed
- **(BREAKING)** Remove `readable-stream` dependency ([#4](https://github.com/MetaMask/extension-port-stream/pull/4))
  - Consumers using this package in browser environments will have to bring their own Node.js stream polyfill.

[Unreleased]: https://github.com/MetaMask/extension-port-stream/compare/v2.0.2...HEAD
[2.0.2]: https://github.com/MetaMask/extension-port-stream/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/MetaMask/extension-port-stream/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/MetaMask/extension-port-stream/releases/tag/v2.0.0
