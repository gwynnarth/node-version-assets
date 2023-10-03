const fs = require('fs'),
    _ = require('underscore'),
    Stream = require('stream');

const Replacer = require('./replace-text');

const GrepReplaceTextInFile = function (opts) {
    const validReplacers = _.isArray(opts.replacers) && _.every(opts.replacers, function (replacer) {
        return (replacer instanceof Replacer);
    });

    if (!_.isObject(opts)) {
        throw new Error('an opts obj must be passed to GrepReplaceTextInFile contructor');
    }

    if (_.isFunction(opts.cb)) {
        this.cb = opts.cb;
    }

    if (validReplacers) {
        this.replacers = opts.replacers;
    } else {
        // throw new Error({
        // 	message: "invalid replacers"
        // });
        // TO DO: change tests so can delete below
        this.replacers = [];
        opts.assets.forEach(function (path) {
            const replacerOpts = {
                newVersion: opts.newVersion,
                requireJs: opts.requireJs,
                filePath: path
            };
            this.replacers.push(new Replacer(replacerOpts));
        }.bind(this));
    }

    this.inputFilePath = opts.filePath;
    this.outputFilePath = opts.filePath + '.tmp';

    this.inputFile = fs.createReadStream(this.inputFilePath);
    this.outputFile = fs.createWriteStream(this.outputFilePath);

    this.tranformStream = new Stream();
    this.tranformStream.readable = true;
    this.tranformStream.writable = true;

    _(this).bindAll('run');
};

GrepReplaceTextInFile.inputFile = null;
GrepReplaceTextInFile.outputFile = null;
GrepReplaceTextInFile.inputFilePath = null;
GrepReplaceTextInFile.outputFilePath = null;

GrepReplaceTextInFile.prototype.run = function (callback) {
    const self = this,
        cb = (_.isFunction(callback)) ? callback : self.cb;

    this.tranformStream.write = function (buf) {
        let str = buf.toString();
        self.replacers.forEach(function (replacer) {
            str = replacer.run(str);
        });
        self.tranformStream.emit('data', str);
    };

    this.tranformStream.end = function (buf) {
        if (arguments.length) {
            self.tranformStream.write(buf);
        }

        self.tranformStream.writable = false;
        self.tranformStream.emit('end');
    };

    this.tranformStream.destroy = function () {
        self.tranformStream.writable = false;
    };

    this.outputFile.on('finish', () => {
        fs.unlink(self.inputFilePath, function (err) {
            if (err) return cb(err);

            fs.rename(self.outputFilePath, self.inputFilePath, function (err) {
                cb(err, self.inputFilePath);
            });
        });
    });

    this.inputFile.on('error', cb);
    this.outputFile.on('error', cb);
    this.tranformStream.on('error', cb);

    this.inputFile.pipe(this.tranformStream).pipe(this.outputFile);
};

module.exports = GrepReplaceTextInFile;