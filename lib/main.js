const fs = require('fs'), async = require('async'),
    _ = require('underscore'),
    glob = require('glob');

const Replacer = require('./replace-text'),
    Deleter = require('./delete'),
    Creator = require('./create'),
    GrepFile = require('./grep');

const initAssetClasses = function (assetsArr, Klass, self) {
    const valid = _.isArray(assetsArr);

    return valid && assetsArr.map(function (path, index) {
        const opts = _.extend({}, this.baseOpts, {
            filePath: path, replacer: this.replacers[index], newVersion: this.replacers[index].newVersion
        });
        return new Klass(opts);
    }.bind(self));
};

const initGrepClasses = function (assetsArr, Klass, self) {
    const valid = _.isArray(assetsArr);

    return valid && assetsArr.map(function (path) {
        const opts = _.extend({}, this.baseOpts, {
            filePath: path, replacers: this.replacers
        });
        return new Klass(opts);
    }.bind(self));
};

const Version = function (opts) {
    if (!_.isObject(opts)) {
        opts.silenceError || opts === 'silenceErrorJustForTests' || console.error('an opts obj must be passed to main constructor', opts);
        throw new Error('an opts obj must be passed to main constructor: ' + opts);
    }
    if (!_.isArray(opts.assets)) {
        opts.silenceError || console.error('files array is missing', opts);
        throw new Error('files array is missing: ' + opts.assets);
    }

    if (_.isFunction(opts.cb)) this.cb = opts.cb;

    this.silence = opts.silence;
    this.assets = opts.assets;
    this.requireJs = opts.requireJs; // remove js suffix when replacing text in these files
    this.keepOriginalAndOldVersions = opts.keepOriginalAndOldVersions;
    this.keepOriginal = opts.keepOriginal;
    this.keepOldVersions = opts.keepOldVersions;
    this.cdnPath = opts.cdnPath;

    const grepFiles = (opts.grepFiles && _.isArray(opts.grepFiles)) ? opts.grepFiles : [];

    this.grepFiles = grepFiles.reduce(function appendGlobbedFiles(files, currentFile) {
        return files.concat(glob.sync(currentFile));
    }, []);

    this.baseOpts = {
        newVersion: opts.newVersion,
        assets: this.assets,
        keepOriginalAndOldVersions: this.keepOriginalAndOldVersions,
        keepOriginal: this.keepOriginal,
        keepOldVersions: this.keepOldVersions,
        requireJs: this.requireJs,
        cdnPath: this.cdnPath
    };

    return _(this).bindAll('run', 'initReplacers', 'checkPaths', 'grepFilesReplace', 'renameAssetsInFilesystem', 'deleteOldAssetsInFilesystem');
};

Version.prototype.checkPaths = function (cb) {
    const allFiles = (this.grepFiles.length) ? this.assets.concat(this.grepFiles) : this.assets;
    allFiles.length && async.every(allFiles, function (f, cb) {
        fs.stat(f, function (err, s) {
            if (err) {
                return cb(false);
            }
            cb(s.isFile());
        });
    }, function (allFilesExist) {
        let err = null;

        if (!allFilesExist) {
            err = new Error()
            err = '\nWe cannot find all these files, are you sure the paths are correct for every one?\n';
            err += allFiles.toString().replace(/,/gi, '\n');
            err += '\n\nRemember paths are relative to where you are running the script.\n\n';
        }

        if (_.isFunction(cb)) {
            cb(err, allFiles);
        } else {
            throw new Error('must pass callback');
        }
    });

    return this;
};

Version.prototype.initReplacers = function (cb) {
    this.replacers = [];

    this.assets.forEach(function (path) {
        const replacerOpts = _.extend({}, this.baseOpts, {filePath: path});
        this.replacers.push(new Replacer(replacerOpts));
    }.bind(this));

    void async.parallel(_.pluck(this.replacers, 'assignNewVersion'), cb);
};

Version.prototype.grepFilesReplace = function (cb) {
    if (this.grepFiles.length) {
        this.greppers = initGrepClasses(this.grepFiles, GrepFile, this);
        void async.parallel(_.pluck(this.greppers, 'run'), cb);
    } else {
        cb(null, null);
    }
};

Version.prototype.renameAssetsInFilesystem = function (cb) {
    this.creators = initAssetClasses(this.assets, Creator, this);
    if (this.creators.length) {
        void async.parallel(_.pluck(this.creators, 'run'), cb);
    } else {
        cb(null, null);
    }
};

Version.prototype.deleteOldAssetsInFilesystem = function (cb) {
    const dontDelete = (this.keepOriginalAndOldVersions === true || this.keepOldVersions === true || !this.assets.length);
    if (dontDelete) {
        cb(null, null);
    } else {
        this.deleters = initAssetClasses(this.assets, Deleter, this);
        void async.parallel(_.pluck(this.deleters, 'run'), cb);
    }
};

Version.prototype.run = function (cb) {
    _.isFunction(cb) || this.cb && (cb = this.cb) || (cb = function () {});

    const silence = this.silence;
    void async.series([this.checkPaths, this.initReplacers], function (err) {
        let msg = '';
        if (err) {
            msg += '\nError!\n' + err;
            console.error(msg);
            console.error('err', err);
            cb(err);
        } else {
            void async.parallel([this.grepFilesReplace, this.renameAssetsInFilesystem, this.deleteOldAssetsInFilesystem], function (err, renameResults) {
                let indent = '\n   ',
                    deletedVersionedFiles,
                    deletedOriginalFiles,
                    deletedDeduplicated,
                    newVersions;
                if (err) {
                    msg += '\nError!\n' + err;
                } else if (_.isArray(renameResults) && renameResults.length) {
                    deletedVersionedFiles = _.flatten(renameResults[2]);
                    if (renameResults[1].length) {
                        newVersions = _(renameResults[1]).pluck('newFile').map(function (res) {
                            return (deletedVersionedFiles.indexOf(res) !== -1) ? res + ": file unchanged > version number re-used" : res + "";
                        });

                        deletedOriginalFiles = _.chain(renameResults[1]).filter(function (resObj) {
                            return _(resObj).has('deletedOriginalFile');
                        }).pluck('deletedOriginalFile').value();

                        deletedDeduplicated = deletedVersionedFiles.filter(function (res) {
                            return renameResults[1].indexOf(res) === -1;
                        });

                        if (deletedOriginalFiles.length) {
                            deletedDeduplicated = deletedDeduplicated.concat(deletedOriginalFiles).sort();
                        }
                    } else {
                        deletedDeduplicated = deletedVersionedFiles;
                    }

                    if (deletedDeduplicated.length) {
                        msg += '\nDeleted Assets:' + indent;
                        msg += deletedDeduplicated.toString().replace(/,/gi, indent) + '\n';
                    }
                    if (newVersions.length) {
                        msg += '\nVersioned Assets Created:' + indent;
                        msg += newVersions.sort().toString().replace(/,/gi, indent) + '\n';
                    }
                    if (_.isArray(renameResults[0])) {
                        msg += '\nFiles whose contents were updated with refs to renamed asset files:' + indent;
                        msg += renameResults[0].sort().toString().replace(/,/gi, indent) + '\n';
                    }
                }

                silence || console.log(msg);
                cb(err, renameResults);
            });
        }
    }.bind(this));
};

module.exports = Version;
