/*jshint node: true*/


var dgram = require("dgram");
var RRQResponse = require("./lib/rrqresponse");

var OPCODE = require("./lib/constants");

function createServer(handler) {

  var server = dgram.createSocket("udp4");

  server.on("message", function (msg, rinfo) {
    var opcode = msg.readUInt16BE(0);

    if (opcode !== 1) {
      console.log("other opcode", opcode);
      return;
    }

    var reqData = [];
    var start, end;
    for (start = end = 2; end < msg.length; end += 1) {
      if (msg[end] === 0) {
        var s = msg.slice(start, end).toString();
        reqData.push(s);
        start = end+1;
      }
    }

    var request = {
      opcode: opcode,
      path: reqData[0],
      mode: reqData[1]
    };

    if (opcode === OPCODE.RRQ) {
      console.log("RRQ", reqData);
      handler(request, new RRQResponse(rinfo));
    }
    else {
      throw new Error("OPCODE not implemented: " + opcode);
    }

  });

  return server;

}

module.exports = {
  createServer: createServer,
  OPCODE: OPCODE
};
