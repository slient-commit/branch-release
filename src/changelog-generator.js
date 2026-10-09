/**
 * Generates a changelog entry
 * @param {string} version - New version
 * @param {string} branchName - Branch name
 * @param {string} jiraTicket - Jira ticket number (optional)
 * @returns {string} - Markdown changelog entry
 */
function generateChangelogEntry(version, branchName, jiraTicket) {
  const date = new Date().toISOString().split('T')[0];
  
  let entry = `## [${version}] - ${date}\n\n`;
  
  if (jiraTicket) {
    entry += `- ${jiraTicket}: Changes from ${branchName}\n`;
  } else {
    entry += `- Changes from ${branchName}\n`;
  }
  
  return entry;
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