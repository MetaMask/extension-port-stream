# Extension Port Stream

A module for creating a node-style stream over a WebExtension port object.

## Usage

```javascript
const PortStream = require('extension-port-stream')

extension.runtime.onConnect.addListener(connectRemote)
const portStream = new PortStream(remotePort)

// Enjoy!
```

