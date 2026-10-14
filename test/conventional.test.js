const { test } = require('node:test');
const assert = require('node:assert');
const { classifyCommit, computeVersionFromCommits } = require('../src/conventional');

test('classifyCommit maps Conventional Commit types', () => {
  assert.equal(classifyCommit('feat: add export'), 'minor');
  assert.equal(classifyCommit('fix: null guard'), 'patch');
  assert.equal(classifyCommit('fix(core): scope'), 'patch');
  assert.equal(classifyCommit('feat!: drop v1'), 'major');
  assert.equal(classifyCommit('fix(api)!: breaking fix'), 'major');
  assert.equal(classifyCommit('feat: x\n\nBREAKING CHANGE: removed y'), 'major');
  assert.equal(classifyCommit('chore: deps'), null);
  assert.equal(classifyCommit('Merge branch main'), null);
});

test('computeVersionFromCommits applies bumps cumulatively in timeline order', () => {
  const commits = ['fix: a', 'fix: b', 'feat: c', 'fix: d', 'feat!: e'];
  // 1.2.0 → 1.2.1 → 1.2.2 → 1.3.0 → 1.3.1 → 2.0.0
  assert.equal(computeVersionFromCommits('1.2.0', commits), '2.0.0');
});

test('computeVersionFromCommits ignores non-impacting commits and returns base when none', () => {
  assert.equal(computeVersionFromCommits('0.5.0', ['chore: x', 'docs: y']), '0.5.0');
  assert.equal(computeVersionFromCommits('0.5.0', []), '0.5.0');
});

test('order matters: a feature after fixes resets the patch count', () => {
  assert.equal(computeVersionFromCommits('1.0.0', ['fix: a', 'fix: b', 'feat: c']), '1.1.0');
  assert.equal(computeVersionFromCommits('1.0.0', ['feat: c', 'fix: a', 'fix: b']), '1.1.2');
});
