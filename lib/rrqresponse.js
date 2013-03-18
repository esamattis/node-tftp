/*jshint node: true*/

var util = require("util");
var stream = require("stream");
var fs = require("fs");
var dgram = require("dgram");

var OPCODE = require("./constants");

function RRQResponse(options){
  this.address = options.address;
  this.port = options.port;

  this.start = Date.now();
  this.byteCount = 0;

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

        if (this.buffer.length === 0) {
          var took = (Date.now() - this.start) / 1000;
          var speed =  (this.byteCount / took / 1024 / 1024);
          console.log("Speed", speed, "MB/s");
        }

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

  this.byteCount += chunk.length;

  if (this.buffer) {
    this.buffer = Buffer.concat(
      [this.buffer, chunk],
      this.buffer.length + chunk.length
    );
  }
  else {
    this.buffer = chunk;
  }

  // console.log("wrote to buffer", this.buffer.length / 1024, "k");

  if (this.requestMoreData) throw "fuu";
  this.requestMoreData = cb;
  this._next();
};

RRQResponse.prototype._next = function() {
  var header, block, packet, cb;

  // If have still some more data coming in and our tftp buffer has become too
  // small for the current block size. Request more data by calling the _write
  // callback.
  if (!this.finished && this.buffer.length <= this.blockSize) {
    cb = this.requestMoreData;
    this.requestMoreData = null;
    return cb();
  }

  if (this.sending) return;
  this.sending = true;


  // Next block is at max the size of the current block size
  block = this.buffer.slice(0, this.blockSize);

  // Create new buffer with 4 bytes for the header
  packet = new Buffer(4 + block.length);

  // Write TFTP DATA block header
  this.blockNum += 1;
  packet.writeUInt16BE(OPCODE.DATA, 0);
  packet.writeUInt16BE(this.blockNum, 2);

  block.copy(packet, 4);

  // Put rest back to the buffer
  this.buffer = this.buffer.slice(this.blockSize);

  this.socket.send(packet, 0, packet.length, this.port, this.address);
};


module.exports = RRQResponse;
