# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] - 2021-04-29

### Changed

- Move `webextension-polyfill-ts` from `devDependencies` to `dependencies` ([#11](https://github.com/MetaMask/extension-port-stream/pull/11))

## [2.0.0] - 2020-11-23

### Added

- TypeScript typings ([#4](https://github.com/MetaMask/extension-port-stream/pull/4))

### Removed

- **(BREAKING)** Remove `readable-stream` dependency ([#4](https://github.com/MetaMask/extension-port-stream/pull/4))
  - Consumers using this package in browser environments will have to bring their own Node.js stream polyfill.

[Unreleased]:https://github.com/MetaMask/extension-port-stream/compare/v2.0.0...HEAD
[2.0.0]:https://github.com/MetaMask/extension-port-stream/compare/v1.0.0...v2.0.0
