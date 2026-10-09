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
    // No LLM configured: list the commit subjects we collected.
    if (commits) {
      body = commits.split('\n').map((c) => `- ${c}`).join('\n');
    } else {
      body = jiraTicket
        ? `- ${jiraTicket}: Changes from ${branchName}`
        : `- Changes from ${branchName}`;
    }
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
  
  const header = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  const existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : header;

  // Insert the new entry above the first existing version entry; if none yet,
  // append it after the header/intro so the intro stays on top.
  const idx = existing.indexOf('\n## ');
  const updated = idx === -1
    ? `${existing.trimEnd()}\n\n${newEntry}\n`
    : `${existing.slice(0, idx + 1)}${newEntry}\n${existing.slice(idx + 1)}`;

  fs.writeFileSync(fullPath, updated, 'utf-8');
}

module.exports = { generateChangelogEntry, prependToChangelog };