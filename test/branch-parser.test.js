const { test } = require('node:test');
const assert = require('node:assert');
const { parseBranchName, extractJiraTicket } = require('../src/branch-parser');

test('parseBranchName maps prefixes to bump types', () => {
  assert.equal(parseBranchName('breaking/foo'), 'major');
  assert.equal(parseBranchName('major/foo'), 'major');
  assert.equal(parseBranchName('feature/foo'), 'minor');
  assert.equal(parseBranchName('feat/foo'), 'minor');
  assert.equal(parseBranchName('release/foo'), 'minor');
  assert.equal(parseBranchName('bugfix/foo'), 'patch');
  assert.equal(parseBranchName('fix/foo'), 'patch');
  assert.equal(parseBranchName('hotfix/foo'), 'patch');
});

test('parseBranchName is case-insensitive', () => {
  assert.equal(parseBranchName('FEATURE/Foo'), 'minor');
});

test('parseBranchName defaults unknown prefixes to patch', () => {
  assert.equal(parseBranchName('wip/foo'), 'patch');
  assert.equal(parseBranchName('main'), 'patch');
});

test('extractJiraTicket pulls the key or returns null', () => {
  assert.equal(extractJiraTicket('feature/OMNISSIUM-123-add-export'), 'OMNISSIUM-123');
  assert.equal(extractJiraTicket('fix/ABC-9'), 'ABC-9');
  assert.equal(extractJiraTicket('feature/no-ticket-here'), null);
});
