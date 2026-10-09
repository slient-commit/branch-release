/**
 * Optional LLM-generated changelog body. Returns markdown bullets, or null when
 * no LLM key is set (ANTHROPIC_API_KEY or OPENAI_API_KEY) so the caller can fall
 * back to the branch-name logic. Uses raw fetch to match the other API clients.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function buildPrompt(version, branchName, jiraTicket, commits) {
  const ticketLine = jiraTicket ? `Jira ticket: ${jiraTicket}\n` : '';
  return (
    `Write the body of a changelog entry for version ${version} (branch ${branchName}).\n` +
    ticketLine +
    `Summarize the commit messages below into a concise markdown bullet list. ` +
    `Group related changes, use clear user-facing language. ` +
    `Output ONLY the bullet list — no version header, no preamble.\n\nCommits:\n${commits}`
  );
}

async function callAnthropic(prompt) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.map((b) => b.text || '').join('').trim();
}

async function callOpenAI(prompt) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

/**
 * @returns {Promise<string|null>} markdown bullets, or null if no LLM configured / no commits
 */
async function generateChangelogBody({ version, branchName, jiraTicket, commits }) {
  if (!commits) return null;
  const prompt = buildPrompt(version, branchName, jiraTicket, commits);
  if (process.env.ANTHROPIC_API_KEY) return callAnthropic(prompt);
  if (process.env.OPENAI_API_KEY) return callOpenAI(prompt);
  return null;
}

module.exports = { generateChangelogBody, buildPrompt };
