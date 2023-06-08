const _ = require('underscore'),
    Hash = require('./hash');

const escapeRegExp = function (str) {
    return str.replace(/[\-\[\]\/{}()*+?.\\^$|]/g, "\\$&");
};
const removeSuffix = function (filePath) {
    return filePath.substring(0, filePath.lastIndexOf('.')) || filePath;
};
const returnSuffix = function (filePath) {
    return filePath.substring(filePath.lastIndexOf('.')) || filePath;
};
const prependPath = function (path, filePath) {
    if (!path) {
        return filePath;
    }
    if (path.endsWith('/') || filePath.startsWith('/')) {
        return path + filePath;
    }
    return path + '/' + filePath;
};

const ReplaceText = function (opts) {
    if (!_.isObject(opts)) {
        throw new Error('An object must be passed to ReplaceText constructor');
    }
    if (!_.isString(opts.filePath)) {
        throw new Error('opts.filePath must be a string:' + this.filePath.toString && this.filePath.toString());
    }

    this.newVersion = opts.newVersion;
    this.filePath = opts.filePath;
    this.filePathBeg = removeSuffix(this.filePath);
    this.filePathSuffix = returnSuffix(this.filePath);
    this.requireJs = (opts.requireJs === true) && (this.filePathSuffix === '.js');
    this.fileName = opts.filePath.split('/').pop();
    this.fileNameBeg = removeSuffix(this.fileName);
    this.fileNameSuffix = returnSuffix(this.fileName);
    this.regexFileNameSuffix = escapeRegExp(this.fileNameSuffix);
    this.regexFileNameBeg = escapeRegExp(this.fileNameBeg);
    this.cdnPath = opts.cdnPath;

    this.oldVersionFileNameRegex = new RegExp('(^|\/)' + this.regexFileNameBeg + '\\.[a-z0-9]+' + this.regexFileNameSuffix + '$', "ig");
    this.fileNameRegex = new RegExp('(^|\'|\")(([^\'"]*\/)?)(' + this.regexFileNameBeg + '(\\.[a-z0-9]+' + this.regexFileNameSuffix + ')|' + this.regexFileNameBeg + '(' + this.regexFileNameSuffix + '))', "ig");
    this.fileNameRegexRequireJs = new RegExp(this.regexFileNameBeg + '\\.[a-z0-9]+(?!' + this.regexFileNameSuffix + ')(?!=)("|\')|' + this.regexFileNameBeg + '(?!' + this.regexFileNameSuffix + ')(?!=)("|\')', "ig");

    return _(this).bindAll('assignNewVersion', 'addOutputFileAttrs', 'run');
};

ReplaceText.prototype.addOutputFileAttrs = function () {
    this.outputFilePath = this.filePathBeg + '.' + this.newVersion + this.filePathSuffix;
    this.outputFileName = this.fileNameBeg + '.' + this.newVersion + this.fileNameSuffix;
};

ReplaceText.prototype.hashFile = function (callback) {
    this.hash = new Hash({filePath: this.filePath});
    this.hash.run(function (err, md5sum) {
        if (err) {
            callback(err);
        } else {
            this.newVersion = md5sum;
            this.addOutputFileAttrs();
            callback(null);
        }
    }.bind(this));
}

ReplaceText.prototype.assignNewVersion = function (callback) {
    if (!this.newVersion) {
        this.hashFile(callback);
    } else {
        this.addOutputFileAttrs();
        callback(null);
    }
};

ReplaceText.prototype.appendJS = function (stem, haystack) {
    haystack = haystack.replace(this.fileNameRegexRequireJs, function (str, p1, p2) {
        const closingQuote = p1 || p2 || '';
        return stem + closingQuote;
    });

    return haystack.replace(this.fileNameRegex, '$1' + '$2' + stem + this.fileNameSuffix);
}

ReplaceText.prototype.run = function (haystack, overrideRequireJs) {
    const newFileNameStem = this.fileNameBeg + '.' + this.newVersion;

    haystack = haystack.replace(this.fileNameRegex, function (str, p1, p2) {
        if (p2.startsWith('/')) {
            return p1 + prependPath(this.cdnPath, p2 + newFileNameStem + this.fileNameSuffix);
        }
        return p1 + p2 + newFileNameStem + this.fileNameSuffix;
    }.bind(this));

    if (this.requireJs && overrideRequireJs !== true) {
        haystack = this.appendJS(newFileNameStem, haystack);
    }

    return haystack;
};

module.exports = ReplaceText;
