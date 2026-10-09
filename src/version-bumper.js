const fs = require('fs');
const path = require('path');

/**
 * Reads the current version from package.json
 * @param {string} packageJsonPath - Path to package.json
 * @returns {string} - Current version (e.g., "1.2.3")
 */
function getCurrentVersion(packageJsonPath = 'package.json') {
  const fullPath = path.resolve(packageJsonPath);
  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  return pkg.version;
}

/**
 * Bumps the version according to semver rules
 * @param {string} currentVersion - e.g., "1.2.3"
 * @param {string} bumpType - "major", "minor", or "patch"
 * @returns {string} - New version (e.g., "1.3.0")
 */
function bumpVersion(currentVersion, bumpType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

/**
 * Updates package.json with the new version
 * @param {string} newVersion - The new version string
 * @param {string} packageJsonPath - Path to package.json
 */
function updatePackageJson(newVersion, packageJsonPath = 'package.json') {
  const fullPath = path.resolve(packageJsonPath);
  const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  pkg.version = newVersion;
  fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

module.exports = { getCurrentVersion, bumpVersion, updatePackageJson };