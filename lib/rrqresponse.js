/*jshint node: true*/

var util = require("util");
var stream = require("stream");
var fs = require("fs");
var dgram = require("dgram");

var OPCODE = require("./constants");

function RRQResponse(options){
  this.address = options.address;
  this.port = options.port;

  this.buffer = null;
  this.finished = false;
  this.blockNum = 0;
  this.blockSize = 512;
  this.sending = false;

  this.socket = dgram.createSocket("udp4");
  this.socket.bind();
  this.socket.on("message", function(data) {
    var opcode = data.readUInt16BE(0);
    var ack = data.readUInt16BE(2);

    if (opcode === OPCODE.ACK) {

      if (this.blockNum === ack) {
        // console.log("got ack for", ack);
        this.sending = false;
        this._next();
      }
      else {
        console.error("Unknown ACK:", ack);
      }

    }
    else {
      console.error("Unknown opcode " + opcode);
    }

  }.bind(this));

  this.on("finish", function() {
    // Got last bytes. Mark as finished and send those too
    this.finished = true;
    this._next();
  }.bind(this));

  stream.Writable.call(this);
}

util.inherits(RRQResponse, stream.Writable);


RRQResponse.prototype._write = function(chunk, encoding, cb) {

  if (this.buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
  }
  else {
    this.buffer = chunk;
  }

  // Collect data until we have enough for a full tftp block. On the last block
  // Ignore this, because a packet smaller than the block size ends the
  // connection in tftp spec
  if (!this.finished && this.buffer.length < this.blockSize) {
    console.log("Waiting for more data");
    return cb();
  }

  this._next();
  cb();
};

RRQResponse.prototype._next = function() {
  if (this.sending) return;
  this.sending = true;

  this.blockNum += 1;
  var header = new Buffer(4);
  header.writeUInt16BE(OPCODE.DATA, 0);
  header.writeUInt16BE(this.blockNum, 2);
  var next = this.buffer.slice(0, this.blockSize);
  this.buffer = this.buffer.slice(this.blockSize);

  var packet = Buffer.concat([header, next]);
  this.socket.send(packet, 0, packet.length, this.port, this.address);
};


module.exports = RRQResponse;
