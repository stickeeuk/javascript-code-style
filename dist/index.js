#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = __importDefault(require("chalk"));
var js_beautify_1 = __importDefault(require("js-beautify"));
var fs_1 = __importDefault(require("fs"));
var https_1 = __importDefault(require("https"));
var ora_1 = __importDefault(require("ora"));
var child_process_1 = require("child_process");
var argv = require('yargs')
    .command('$0', "Sets up your project to use stickee Javascript code style.")
    .option('yarn', {
    description: 'Setup for a project that uses Yarn',
    type: 'boolean',
    demand: false,
    default: false,
})
    .argv;
var ESLINT_CONFIG_FILE_NAME = '.eslintrc.json';
var ESLINT_CONFIG_URL = "https://raw.githubusercontent.com/stickeeuk/javascript-code-style/main/" + ESLINT_CONFIG_FILE_NAME;
var ENCODING = 'utf8';
var YARN_LOCK_EXISTS = fs_1.default.existsSync('yarn.lock');
var YARN = argv.yarn || YARN_LOCK_EXISTS;
var syncEslintConfig = function () {
    var spinner = ora_1.default('Syncing eslint config').start();
    return new Promise(function (resolve, reject) {
        if (!fs_1.default.existsSync(ESLINT_CONFIG_FILE_NAME)) {
            spinner.start("downloading " + ESLINT_CONFIG_FILE_NAME + " file...");
            https_1.default.get(ESLINT_CONFIG_URL, function (response) {
                response.pipe(fs_1.default.createWriteStream(ESLINT_CONFIG_FILE_NAME));
            });
            spinner.succeed(chalk_1.default.green(ESLINT_CONFIG_FILE_NAME + " file downloaded"));
            resolve();
        }
        else {
            spinner.warn(chalk_1.default.yellow(ESLINT_CONFIG_FILE_NAME + " file already present"));
            var mergeSpinner_1 = ora_1.default('attempting to merge').start();
            mergeEslintConfigs()
                .then(function (message) {
                mergeSpinner_1.succeed(chalk_1.default.green(message));
                resolve();
            })
                .catch(function (error) {
                mergeSpinner_1.fail(chalk_1.default.red(error));
                reject(error);
            });
        }
    });
};
var mergeEslintConfigs = function () {
    var tmpPath = ESLINT_CONFIG_FILE_NAME + ".tmp";
    return new Promise(function (resolve, reject) {
        var file = fs_1.default.createWriteStream(tmpPath);
        file.on('open', function () {
            https_1.default.get(ESLINT_CONFIG_URL, function (response) {
                if (response.statusCode !== 200) {
                    reject('could not download eslint config');
                }
                response.on('data', function (chunk) {
                    file.write(chunk);
                }).on('end', function () {
                    file.end();
                    var tmpRaw = fs_1.default.readFileSync(tmpPath, ENCODING);
                    var configRaw = fs_1.default.readFileSync(ESLINT_CONFIG_FILE_NAME, ENCODING);
                    var tmp, config;
                    try {
                        tmp = JSON.parse(tmpRaw);
                    }
                    catch (error) {
                        reject(error);
                    }
                    try {
                        config = JSON.parse(configRaw);
                    }
                    catch (error) {
                        reject("Found an empty " + ESLINT_CONFIG_FILE_NAME + " file. If it should be empty then please delete it and run this again.");
                    }
                    if (JSON.stringify(config) === JSON.stringify(tmp)) {
                        resolve('eslint config already setup');
                    }
                    fs_1.default.writeFileSync(ESLINT_CONFIG_FILE_NAME, js_beautify_1.default((JSON.stringify(__assign(__assign({}, config), tmp)))));
                    fs_1.default.unlink(tmpPath, function () {
                        resolve('safely updated existing eslint config');
                    });
                }).on('error', function (error) {
                    console.error(chalk_1.default.red(error));
                    reject(error);
                });
            });
        });
    });
};
var installPeerDependencies = function () {
    var command = "npx install-peerdeps eslint-config-stickee --only-peers " + (YARN ? '--yarn' : '');
    var spinner = ora_1.default('installing peer dependencies...').start();
    return new Promise(function (resolve, reject) {
        child_process_1.exec(command, function (error) {
            if (error) {
                reject(error);
            }
            spinner.succeed(chalk_1.default.green('installed peer dependencies'));
            resolve();
        });
    });
};
console.log(chalk_1.default.white("\nSetting up stickee JavaScript code style" + (YARN ? ' for a Yarn project' : '') + "...\n"));
syncEslintConfig()
    .then(function () {
    return installPeerDependencies();
})
    .then(function () {
    console.log();
    console.log(chalk_1.default.green('stickee JavaScript code style setup complete'));
})
    .catch(function (error) {
    console.log();
    console.log(chalk_1.default.red(error));
    console.error(chalk_1.default.red('Please let me know about it at https://github.com/stickeeuk/javascript-code-style/issues/new/'));
});
