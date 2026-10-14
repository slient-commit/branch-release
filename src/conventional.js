/**
 * Conventional Commits version calculation.
 *
 * Classifies each commit and applies bumps cumulatively in timeline order:
 * a breaking change bumps major (resets minor+patch), a feature bumps minor
 * (resets patch), a fix bumps patch. Order matters — a feature after fixes
 * absorbs those patches via the reset.
 */

/**
 * @param {string} message - full commit message (subject + body)
 * @returns {'major'|'minor'|'patch'|null}
 */
function classifyCommit(message) {
  // Breaking: "BREAKING CHANGE"/"BREAKING-CHANGE" anywhere (footer convention).
  if (/\bBREAKING[ -]CHANGE\b/.test(message)) return 'major';

  // Header: type(scope)!: subject  — the "!" marks a breaking change.
  const header = message.split('\n')[0].match(/^(\w+)(?:\([^)]*\))?(!)?:/);
  if (!header) return null;
  if (header[2]) return 'major';

  const type = header[1].toLowerCase();
  if (type === 'feat') return 'minor';
  if (type === 'fix') return 'patch';
  return null; // chore, docs, refactor, test, etc. — no version impact
}

/**
 * @param {string} baseVersion - e.g. "1.2.3" (the last tag's version)
 * @param {string[]} messages - commits oldest→newest
 * @returns {string} - the computed version
 */
function computeVersionFromCommits(baseVersion, messages) {
  let [major, minor, patch] = baseVersion.split('.').map(Number);
  for (const msg of messages) {
    switch (classifyCommit(msg)) {
      case 'major': major += 1; minor = 0; patch = 0; break;
      case 'minor': minor += 1; patch = 0; break;
      case 'patch': patch += 1; break;
    }
  }
  return `${major}.${minor}.${patch}`;
}

module.exports = { classifyCommit, computeVersionFromCommits };
