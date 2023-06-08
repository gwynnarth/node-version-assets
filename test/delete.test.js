const test = require('tap').test,
    path = require('path'),
    _ = require('underscore');

const Replacer = require('../lib/replace-text'),
    Deleter = require('../lib/delete');

const fixturesDir = path.join(process.cwd(), 'test-utils/fixtures/'),
    opts = {
        cb: function (err, results) {
        },
        assets: [fixturesDir + "css/all-min.css", fixturesDir + "js/app.newie.js", fixturesDir + "js/app.oldie.js"],
        grepFiles: [fixturesDir + "index.html"],
        newVersion: 1111111111
    };

const replacers = [];

opts.assets.forEach(function (filePath) {
    const replacerOpts = {
        newVersion: opts.newVersion,
        requireJs: opts.requireJs,
        filePath: filePath
    };
    replacers.push(new Replacer(replacerOpts));
});

test('Deleter Constructor Fn: shd assign needed properties', function (t) {

    const deleteCSSOpts = _.extend({}, opts, {filePath: opts.assets[0], replacer: replacers[0]}),
        deleterCSS = new Deleter(deleteCSSOpts);

    t.ok(deleterCSS.replacer instanceof Replacer, "this.replacer assigned correctly");
    t.equal(deleterCSS.filePath, opts.assets[0], "this.filePath assigned correctly");

    t.end();
});
