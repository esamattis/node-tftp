/*jshint node: true*/

var fs = require("fs");
var tftp = require("../index");

tftp.createServer(function(req, res) {

  var filePath = __dirname + "/tftpboot/" + req.path;
  fs.createReadStream(filePath).pipe(res);

}).bind(1234);
