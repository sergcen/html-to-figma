const { setup: setupDevServer } = require('jest-dev-server');
const { setup: setupPuppeter } = require('jest-environment-puppeteer')
const chalk = require('chalk');
const puppeteer = require('puppeteer');
const fs = require('fs');
const mkdirp = require('mkdirp');
const os = require('os');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

module.exports = async function () {
    await setupDevServer({
        command: `parcel tests/page/index.html --port 3000`,
        launchTimeout: 50000,
        port: 3000,
    });
    await setupPuppeter();
};
