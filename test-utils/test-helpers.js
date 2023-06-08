const fn = function (filepath) {
    const file = filepath.split("/");
    return file[file.length - 1];
};

const testRunner = function () {
    const terminal = require('child_process').spawn('bash');

    terminal.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    terminal.on('exit', function (code) {
        console.log('child process exited with code ' + code);
    });

    setTimeout(function () {
        console.log('Running tests');
        // terminal.stdin.write('echo "Hello $USER"');
        terminal.stdin.write('npm test');
        terminal.stdin.end();
    }, 1000);
};


const helpers = {
    "fn": fn,
    "testRunner": testRunner
};

module.exports = helpers;