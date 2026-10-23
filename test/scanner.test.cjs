const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromeUserDataPath } = require('../electron/scanner.cjs');

test('builds Windows Chrome user data path', () => {
  assert.equal(chromeUserDataPath('win32', { LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local' }), path.join('C:\\Users\\tester\\AppData\\Local', 'Google', 'Chrome', 'User Data'));
});
