/**
 * Created by northka.chen on 2016/12/9.
 */
let BufferHelper = function () {
    this.buffers = [];
};

BufferHelper.prototype.concat = function (buffer) {
    this.buffers.push(buffer);
    return this;
};

BufferHelper.prototype.empty = function () {
    this.buffers = [];
    return this;
};

BufferHelper.prototype.toBuffer = function () {
    return Buffer.concat(this.buffers);
};

BufferHelper.prototype.toString = function (encoding) {
    return this.toBuffer().toString(encoding);
};

BufferHelper.prototype.load = function (stream, callback) {
    let that = this;
    stream.on('data', function (trunk) {
        that.concat(trunk);
    });
    stream.on('end', function () {
        callback(null, that.toBuffer());
    });
    stream.once('error', callback);
};

module.exports = BufferHelper;
