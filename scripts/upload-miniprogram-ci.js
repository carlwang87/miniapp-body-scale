const ci = require('miniprogram-ci');
const { existsSync } = require('fs');
const { resolve } = require('path');

const appid = process.env.MP_APPID;
const privateKeyPath = process.env.MP_PRIVATE_KEY_PATH || resolve(process.cwd(), 'private.key');
const version = process.env.MP_VERSION || process.env.GITHUB_REF_NAME || '0.1.0';
const desc = process.env.MP_DESC || process.env.GITHUB_SHA || 'GitHub Actions upload';
const robot = Number(process.env.MP_ROBOT || 1);

if (!appid) {
  throw new Error('Missing MP_APPID secret.');
}

if (!existsSync(privateKeyPath)) {
  throw new Error(`Missing private key file: ${privateKeyPath}`);
}

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: process.cwd(),
  privateKeyPath,
  ignores: ['node_modules/**/*', '.git/**/*']
});

ci.upload({
  project,
  version,
  desc,
  setting: {
    es6: true,
    minify: true,
    autoPrefixWXSS: true
  },
  robot
}).then((result) => {
  console.log('Miniprogram upload finished.');
  console.log(JSON.stringify(result, null, 2));
});
