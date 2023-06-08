const fs = require('fs'),
    _ = require('underscore'),
    crypto = require('crypto');

const Hash = function (opts) {
    const gotRequiredOpts = _.isObject(opts) && _.isString(opts.filePath);

    if (gotRequiredOpts) {
        this.filePath = opts.filePath;
    } else {
        throw new Error("not got required opts");
    }

    return _(this).bindAll('run');
};

Hash.prototype.run = function (callback) {
    const s = fs.createReadStream(this.filePath),
        md5sum = crypto.createHash('md5');

    s.on('data', function (d) {
        // this.fileContents += d;
        md5sum.update(d);
    }.bind(this));

    s.on('end', function () {
        this.md5sum = md5sum.digest('hex');
        // callback(null, this.md5sum, this.fileContents);
        callback(null, this.md5sum);
    }.bind(this));

    s.on('error', callback);
};

module.exports = Hash;