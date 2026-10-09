const { generateChangelogBody } = require('./llm-client');

/**
 * Generates a changelog entry. Uses an LLM to summarize commits when an LLM key
 * is set (see llm-client); otherwise falls back to a branch-name line.
 * @param {string} version - New version
 * @param {string} branchName - Branch name
 * @param {string} jiraTicket - Jira ticket number (optional)
 * @param {string} commits - Commit messages since the last tag (optional)
 * @returns {Promise<string>} - Markdown changelog entry
 */
async function generateChangelogEntry(version, branchName, jiraTicket, commits) {
  const date = new Date().toISOString().split('T')[0];
  const header = `## [${version}] - ${date}\n\n`;

  let body;
  try {
    body = await generateChangelogBody({ version, branchName, jiraTicket, commits });
  } catch (err) {
    console.warn(`⚠️  LLM changelog failed (${err.message}), using fallback`);
  }

  if (!body) {
    body = jiraTicket
      ? `- ${jiraTicket}: Changes from ${branchName}`
      : `- Changes from ${branchName}`;
  }

  return `${header}${body}\n`;
}

/**
 * Prepends a changelog entry to CHANGELOG.md
 * @param {string} newEntry - The new changelog entry
 * @param {string} changelogPath - Path to CHANGELOG.md
 */
function prependToChangelog(newEntry, changelogPath = 'CHANGELOG.md') {
  const fs = require('fs');
  const path = require('path');
  const fullPath = path.resolve(changelogPath);
  
  let existing = '';
  if (fs.existsSync(fullPath)) {
    existing = fs.readFileSync(fullPath, 'utf-8');
  } else {
    existing = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  }
  
  const updated = existing.replace(
    /(# Changelog.*?\n\n)/,
    `$1${newEntry}\n`
  );
  
  fs.writeFileSync(fullPath, updated, 'utf-8');
}

module.exports = { generateChangelogEntry, prependToChangelog };