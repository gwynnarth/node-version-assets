const fs = require('fs'),
    _ = require('underscore'),
    async = require('async');

const Replacer = require('./replace-text');

const Deleter = function (opts) {
    const validReplacer = opts.replacer instanceof Replacer;

    if (!_.isObject(opts)) {
        throw new Error('an opts obj must be passed to Deleter constructor');
    }

    if (_.isFunction(opts.cb)) {
        this.cb = opts.cb;
    }

    if (validReplacer && _.isString(opts.filePath)) {
        this.filePath = opts.filePath;
        this.replacer = opts.replacer;
    } else {
        throw new Error("invalid replacers");
    }

    return _(this).bindAll('run', 'dirList', 'markForDeletion', 'deleteFiles');
};

Deleter.prototype.dirList = function (callback) {
    this.directory = this.filePath.split('/').slice(0, -1).join('/');
    fs.readdir(this.directory, function (err, files) {
        this.directoryContents = _(files).map(function (fileName) {
            return fileName;
        }.bind(this));
        _.isFunction(callback) && callback(null, this.directoryContents);
    }.bind(this))
};

Deleter.prototype.markForDeletion = function (callback) {
    this.toBeDeleted = [];
    this.directoryContents.length && this.directoryContents.forEach(function (fileName) {
        const versioned = this.replacer.oldVersionFileNameRegex.test(fileName.toString()),
            newVersion = (fileName === this.replacer.outputFileName);

        if (versioned && !newVersion) {
            this.toBeDeleted.push(this.directory + '/' + fileName.toString());
        }
    }.bind(this));
    _.isFunction(callback) && callback(null, this.toBeDeleted);
};

Deleter.prototype.deleteFiles = function (callback) {
    // fs.stat(path, callback(err, stats)) and stats.isDirectory()
    // currently this code will also delete directories
    // add above fn to check before deleting if this is an issue
    if (this.toBeDeleted.length) {
        async.filter(this.toBeDeleted, fs.exists, function (results) {
            if (results && results.length) {
                async.map(results, fs.unlink, callback);
            } else {
                callback(null, null);
            }
        }.bind(this));
    } else {
        _.isFunction(callback) && callback(null, this.toBeDeleted);
    }
};

Deleter.prototype.run = function (callback) {
    const cb = (_.isFunction(callback)) ? callback : function () {};

    void async.series([
        this.dirList,
        this.markForDeletion,
        this.deleteFiles
    ], function (err) {
        cb(err, this.toBeDeleted);
    }.bind(this));
};

module.exports = Deleter;
