# Streaming TFTP Server for node.js

<http://tools.ietf.org/html/rfc1350>

Experiment with the new [Streams API][] in node.js 0.10.

```javascript
var fs = require("fs");
var tftp = require("tftp");

tftp.createServer(function(req, res) {

  var filePath = "/var/lib/tftpboot/" + req.path;
  fs.createReadStream(filePath).pipe(res);

}).bind(1234);
```

Test with tftp-hpa:

    $ tftp -m octet localhost 1234 -c get pic.jpg

[Streams API]: http://nodejs.org/api/stream.html
