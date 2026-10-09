const { test } = require('node:test');
const assert = require('node:assert');
const { generateChangelogBody, buildPrompt } = require('../src/llm-client');

test('generateChangelogBody returns null when no LLM key is set', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const body = await generateChangelogBody({
    version: '1.2.0',
    branchName: 'feat/x',
    jiraTicket: 'ABC-1',
    commits: 'feat: add x',
  });
  assert.equal(body, null);
});

test('generateChangelogBody returns null when there are no commits', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const body = await generateChangelogBody({ version: '1.2.0', branchName: 'feat/x', commits: '' });
  assert.equal(body, null);
  delete process.env.ANTHROPIC_API_KEY;
});

test('buildPrompt includes commits and ticket', () => {
  const p = buildPrompt('1.2.0', 'feat/x', 'ABC-1', 'feat: add x');
  assert.match(p, /ABC-1/);
  assert.match(p, /feat: add x/);
});
