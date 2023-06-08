const test = require('tap').test,
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    _ = require('underscore');

const Replacer = require('../lib/replace-text'),
    Creator = require('../lib/create');

const fixturesDir = path.join(process.cwd(), '/test-utils/fixtures/'),
    cssDir = fixturesDir + 'css/',
    cssFile = "all-min.css",
    opts = {
        cb: function (err, results) {},
        assets: [cssDir + cssFile, fixturesDir + "js/app.newie.js", fixturesDir + "js/app.oldie.js"],
        grepFiles: [fixturesDir + "index.html"],
        keepOriginalAndOldVersions: true,
        newVersion: 11111111
    }

let creatorCSSOpts,
    creatorCSS,
    replacers = [];

opts.assets.forEach(function (path) {
    const replacerOpts = {
        newVersion: opts.newVersion,
        requireJs: opts.requireJs,
        filePath: path
    };
    replacers.push(new Replacer(replacerOpts));
});

creatorCSSOpts = _.extend({}, opts, {filePath: opts.assets[0], replacer: replacers[0]});
creatorCSS = new Creator(creatorCSSOpts);

test('Creator Constructor Func', function (t) {
    t.ok(creatorCSS.replacer instanceof Replacer, "Creator.replacer is not an instance of Replacer");
    t.equal(creatorCSS.replacer.newVersion, opts.newVersion, "Creator.replacer.newVersion is not " + opts.newVersion);
    t.equal(creatorCSS.filePath, opts.assets[0], "Creator.filePath is not " + opts.assets[0]);
    t.end();
});

test('Creator.run()', function (t) {
    const cssOldVersion = cssFile.replace('.css', '.123456.css'),
        cssOldVersionOriginal = cssOldVersion.replace('.css', '.css.original'),
        cssOriginal = cssFile.replace('.css', '.css.original'),
        cssVersioned = cssFile.replace(/(\.css)/, '.' + opts.newVersion + "$1"),
        expectedDirContents = [cssOldVersionOriginal, cssFile, cssOriginal, cssVersioned, cssOldVersion];

    async.series([
        creatorCSS.replacer.assignNewVersion,
        creatorCSS.run
    ], function () {

        t.deepEqual(fs.readdirSync(cssDir).sort(), expectedDirContents.sort(), "Unexpected directory content");

        fs.unlink(cssDir + cssVersioned, function () {
            t.end();
        });
    });
});
