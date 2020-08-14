#!/usr/bin/env node
import chalk from 'chalk';
import jsbeautify from 'js-beautify';
import fs from 'fs';
import https from 'https';
import ora from 'ora';
import { exec } from 'child_process';

const argv = require('yargs')
    .command('$0', `Sets up your project to use stickee Javascript code style.`)
    .option('yarn', {
        description: 'Setup for a project that uses Yarn',
        type: 'boolean',
        demand: false,
        default: false,
    })
    .argv;

const ESLINT_CONFIG_FILE_NAME = '.eslintrc.json';
const ESLINT_CONFIG_URL = `https://raw.githubusercontent.com/stickeeuk/javascript-code-style/master/${ESLINT_CONFIG_FILE_NAME}`;

const ENCODING = 'utf8';

const YARN_LOCK_EXISTS = fs.existsSync('yarn.lock');
const YARN = argv.yarn || YARN_LOCK_EXISTS;

const syncEslintConfig = () => {
    const spinner = ora('Syncing eslint config').start();
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(ESLINT_CONFIG_FILE_NAME)) {
            spinner.start(`downloading ${ESLINT_CONFIG_FILE_NAME} file...`)
            https.get(ESLINT_CONFIG_URL, function(response) {
                response.pipe(fs.createWriteStream(ESLINT_CONFIG_FILE_NAME));
            });
            spinner.succeed(chalk.green(`${ESLINT_CONFIG_FILE_NAME} file downloaded`))
            resolve();
        } else {
            spinner.warn(chalk.yellow(`${ESLINT_CONFIG_FILE_NAME} file already present`))
            const mergeSpinner = ora('attempting to merge').start();
            mergeEslintConfigs()
                .then(message => {
                    mergeSpinner.succeed(chalk.green(message));
                    resolve();
                })
                .catch((error) => {
                    mergeSpinner.fail(chalk.red(error))
                    reject(error)
                });
        }
    });
}

const mergeEslintConfigs = () => {
    const tmpPath = `${ESLINT_CONFIG_FILE_NAME}.tmp`;
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(tmpPath);
        file.on('open', () => {
            https.get(ESLINT_CONFIG_URL, (response) => {
                if (response.statusCode !== 200) {
                    reject('could not download eslint config');
                }
                response.on('data', (chunk) => {
                    file.write(chunk);
                }).on('end', () => {
                    file.end();
                    const tmpRaw = fs.readFileSync(tmpPath, ENCODING);
                    const configRaw = fs.readFileSync(ESLINT_CONFIG_FILE_NAME, ENCODING);
                    let tmp, config;
                    try {
                        tmp = JSON.parse(tmpRaw);
                    } catch (error) {
                        reject(error)
                    }
                    try {
                        config = JSON.parse(configRaw);
                    } catch (error) {
                        reject(`Found an empty ${ESLINT_CONFIG_FILE_NAME} file. If it should be empty then please delete it and run this again.`);
                    }
                    if (JSON.stringify(config) === JSON.stringify(tmp)) {
                        resolve('eslint config already setup')
                    }
                    fs.writeFileSync(ESLINT_CONFIG_FILE_NAME, jsbeautify((JSON.stringify({
                        ...config,
                        ...tmp
                    }))))
                    fs.unlink(tmpPath, () => {
                        resolve('safely updated existing eslint config');
                    });
                }).on('error', (error) => {
                    console.error(chalk.red(error));
                    reject(error);
                })
            })
        });
    })
}

const installPeerDependencies = () => {
    const command = `npx install-peerdeps eslint-config-stickee --only-peers ${YARN ? '--yarn' : ''}`;    
    const spinner = ora('installing peer dependencies...').start()
    return new Promise((resolve, reject) => {
        exec(command, (error) => {
            if (error) {
                reject(error);
            }

            spinner.succeed(chalk.green('installed peer dependencies'));

            resolve();
        });
    });
}

console.log(chalk.white(`\nSetting up stickee JavaScript code style${YARN ? ' for a Yarn project' : ''}...\n`));

syncEslintConfig()
    .then(() => {
        return installPeerDependencies();
    })
    .then(() => {
        console.log();
        console.log(chalk.green('stickee JavaScript code style setup complete'));
    })
    .catch((error) => {
        console.log();
        console.log(chalk.red(error));
        console.error(chalk.red('Please let me know about it at https://github.com/stickeeuk/javascript-code-style/issues/new/'))
    });
