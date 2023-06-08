const test = require('tap').test,
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore');

const Hash = require('../lib/hash');

const fixturesDir = path.join(process.cwd(), 'test-utils/fixtures/'),
    cssDir = fixturesDir + 'css/',
    cssFile = "all-min.css",
    opts = {
        cb: function (err, results) {
        },
        assets: [cssDir + cssFile, fixturesDir + "js/app.newie.js", fixturesDir + "js/app.oldie.js"],
        grepFiles: [fixturesDir + "index.html"],
        newVersion: 11111111
    };

test('Hash.run(): shd create md5 hash', function (t) {
    const hashCSS = new Hash({filePath: opts.assets[0]}),
        appendContent = function (callback) {
            fs.appendFile(hashCSS.filePath, 'data to append', callback);
        };

    t.equal(hashCSS.filePath, opts.assets[0], "this.filePath assigned correctly");

    async.series([
        hashCSS.run,
        appendContent,
        hashCSS.run
    ], function (err, results) {

        const newHash = Array.prototype.slice.call(results)[0][0],
			originalHash = Array.prototype.slice.call(results)[2][0];

        t.ok(_.isString(originalHash), "first hash has been generated");
        t.ok(_.isString(newHash), "second hash has been generated");
        t.notEqual(originalHash, newHash, "hashes are different after appending content");

        t.end();
    })
});
