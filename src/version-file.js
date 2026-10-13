const fs = require('fs');
const path = require('path');

/**
 * Patterns that capture a semver (x.y.z) in group 2, tried in order. Each is
 * specific enough not to match unrelated versions — e.g. the MSBuild pattern
 * matches <Version>1.2.3</Version> but NOT a PackageReference Version="1.2.3".
 * Groups 1 and 3 are the surrounding text, preserved on write-back.
 */
const PATTERNS = [
  /(<Version>)(\d+\.\d+\.\d+)(<\/Version>)/i,             // .csproj / Directory.Build.props
  /(<VersionPrefix>)(\d+\.\d+\.\d+)(<\/VersionPrefix>)/i,
  /("version"\s*:\s*")(\d+\.\d+\.\d+)(")/i,               // JSON
  /^(\s*)(\d+\.\d+\.\d+)(\s*)$/,                           // bare version file (VERSION, .version)
];

function findMatch(content) {
  for (const re of PATTERNS) {
    const m = content.match(re);
    if (m) return { re, version: m[2] };
  }
  return null;
}

/**
 * @param {string} filePath
 * @returns {string} the current version (x.y.z)
 */
function getVersionFromFile(filePath) {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const found = findMatch(content);
  if (!found) throw new Error(`No version (x.y.z) found in ${filePath}`);
  return found.version;
}

/**
 * Rewrites only the matched version occurrence, preserving surrounding markup.
 * @param {string} filePath
 * @param {string} newVersion
 */
function updateVersionFile(filePath, newVersion) {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const found = findMatch(content);
  if (!found) throw new Error(`No version (x.y.z) found in ${filePath}`);
  const updated = content.replace(found.re, (_m, before, _v, after) => `${before}${newVersion}${after}`);
  fs.writeFileSync(fullPath, updated, 'utf-8');
}

module.exports = { getVersionFromFile, updateVersionFile };
