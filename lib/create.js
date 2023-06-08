const fs     = require('fs'),
	_      = require('underscore');

const Replacer = require('./replace-text');

const Creator = function (opts) {
	const	validReplacer = opts.replacer instanceof Replacer;

	if (!_.isObject(opts)) {
		throw new Error('an opts obj must be passed to Deleter constructor');
	}

	if (_.isFunction(opts.cb)) {
		this.cb = opts.cb;
	}

	if (validReplacer && _.isString(opts.filePath)) {
		this.replacer = opts.replacer;
		this.filePath = opts.filePath;
		this.keepOriginalAndOldVersions = opts.keepOriginalAndOldVersions;
		this.keepOriginal = opts.keepOriginal;
	} else {
		throw new Error("invalid replacers");
	}

	return _(this).bindAll('run');
};

Creator.prototype.run = function (callback) {
	const cb = (_.isFunction(callback)) ? callback : function() {};

	this.inputFile = fs.createReadStream(this.filePath);
	this.outputFile = fs.createWriteStream(this.replacer.outputFilePath);

	this.inputFile.on('error', cb);
	this.outputFile.on('error', cb);

	this.outputFile.end = function () {
		const resObj = {
			newFile: this.replacer.outputFilePath
		};
		if (this.keepOriginalAndOldVersions !== true && this.keepOriginal !== true) {
			fs.unlink(this.filePath, function (err) {
				if (!err) resObj.deletedOriginalFile = this.filePath;
				cb(err, resObj);
			}.bind(this));
		} else {
			cb(null, resObj);
		}
	}.bind(this);
	this.inputFile.pipe(this.outputFile);
};

module.exports = Creator;
