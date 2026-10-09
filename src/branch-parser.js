/**
 * Parses a branch name and determines the semantic version bump type
 * 
 * Conventions:
 * - feature/... or feat/... → minor
 * - bugfix/... or fix/... → patch
 * - breaking/... or major/... → major
 * - hotfix/... → patch
 * - release/... → minor (or you can customize)
 * 
 * @param {string} branchName - The branch name (e.g., "feature/OMNISSIUM-123-add-export")
 * @returns {string} - "major", "minor", or "patch"
 */
function parseBranchName(branchName) {
  const normalized = branchName.toLowerCase().trim();
  
  // Major version bumps
  if (normalized.startsWith('breaking/') || normalized.startsWith('major/')) {
    return 'major';
  }
  
  // Minor version bumps
  if (normalized.startsWith('feature/') || normalized.startsWith('feat/')) {
    return 'minor';
  }
  
  // Patch version bumps
  if (normalized.startsWith('bugfix/') || normalized.startsWith('fix/') || normalized.startsWith('hotfix/')) {
    return 'patch';
  }
  
  // Release branches (customize as needed)
  if (normalized.startsWith('release/')) {
    return 'minor'; // or 'patch' depending on your workflow
  }
  
  // Default to patch if unknown
  console.warn(`⚠️  Unknown branch prefix in "${branchName}", defaulting to patch`);
  return 'patch';
}

/**
 * Extracts the Jira ticket number from a branch name
 * @param {string} branchName - e.g., "feature/OMNISSIUM-123-add-export"
 * @returns {string|null} - e.g., "OMNISSIUM-123" or null
 */
function extractJiraTicket(branchName) {
  const match = branchName.match(/([A-Z]+-[0-9]+)/);
  return match ? match[1] : null;
}

module.exports = { parseBranchName, extractJiraTicket };