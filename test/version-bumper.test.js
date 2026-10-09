const { test } = require('node:test');
const assert = require('node:assert');
const { bumpVersion } = require('../src/version-bumper');

test('bumpVersion bumps each level and resets lower ones', () => {
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
});

test('bumpVersion throws on an invalid bump type', () => {
  assert.throws(() => bumpVersion('1.2.3', 'nope'), /Invalid bump type/);
});
