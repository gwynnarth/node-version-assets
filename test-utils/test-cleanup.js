const async = require('async'),
    fs = require('fs'),
    path = require('path');

const Replacer = require('../lib/replace-text'),
    Deleter = require('../lib/delete');

const postTest = function (callback, fix) {
    const versionNum = 123456,
        fixturesDir = fix || path.join(process.cwd(), 'test-utils/fixtures/'),
        assets = [fixturesDir + "css/all-min.css", fixturesDir + "js/app.newie.js", fixturesDir + "js/app.oldie.js", fixturesDir + "js/bundle.js", fixturesDir + "js/login-bundle.js"],
        grepFiles = [fixturesDir + "index.html"];

    const allFiles = assets.concat(grepFiles),
        versionedFiles = allFiles.map(function (fPath) {
            let file;
            fPath.replace(/(.*)(.js|.css)$/, function (match, p1, p2) {
                file = p1 + '.' + versionNum + p2;
            });
            return {
                file: file,
                original: file + '.original'
            };
        }).slice(0, -1), // get rid of index.html
        writeFilesArrayFns = [],
        deleteFiles = function (assetPath, cb) {
            const replacer = new Replacer({filePath: assetPath, newVersion: 123456}),
                deleter = new Deleter({filePath: assetPath, replacer: replacer});

            deleter.run(cb);
        },
        restoreFileContents = function (assetPath, cb) {
            fs.readFile(assetPath + '.original', cb);
        },
        restoreVersionedFile = function (versioned, cb) {
            const read = fs.createReadStream(versioned.original)
                    .on('end', cb)
                    .on('error', cb),
                write = fs.createWriteStream(versioned.file)
                    .on('end', cb)
                    .on('error', cb)

            read.pipe(write);
        };

    async.map(allFiles, deleteFiles, function () {

        async.map(versionedFiles, restoreVersionedFile, function (err) {
            if (err) {
                return callback(err);
            }

            async.map(allFiles, restoreFileContents, function (err, originalFiles) {
                if (err) {
                    return callback(err);
                }

                originalFiles.forEach(function (original, index) {
                    const origFile = originalFiles[index];

                    if (origFile) {
                        writeFilesArrayFns.push(function (cb) {
                            fs.writeFile(allFiles[index], originalFiles[index].toString(), cb);
                        });
                    }
                });

                void async.parallel(writeFilesArrayFns, callback);
            });

        });
    });
};

module.exports = postTest;
