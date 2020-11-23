# Extension Port Stream

A module for creating a Node-style stream over a WebExtension [Runtime.Port](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port) object.

## Usage

```javascript
const PortStream = require('extension-port-stream')

extension.runtime.onConnect.addListener(connectRemote)
const portStream = new PortStream(remotePort)

// Enjoy!
```
