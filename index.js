#!/usr/bin/env node

const { program } = require('commander');
const { parseBranchName, extractJiraTicket } = require('./src/branch-parser');
const { getCurrentVersion, bumpVersion, updatePackageJson } = require('./src/version-bumper');
const { GiteaClient } = require('./src/gitea-client');
const { jiraFromEnv } = require('./src/jira-client');
const { generateChangelogEntry, prependToChangelog } = require('./src/changelog-generator');
const { execSync } = require('child_process');

program
  .name('branch-release')
  .description('Semantic versioning based on branch naming conventions')
  .version('1.0.0');

program
  .command('release')
  .description('Bump version based on current branch name')
  .option('--dry-run', 'Show what would happen without making changes')
  .option('--no-tag', 'Skip creating git tag')
  .option('--no-release', 'Skip creating Gitea release')
  .action(async (options) => {
    try {
      // 1. Get current branch name
      const branchName = process.env.GITEA_REF_NAME || 
                         process.env.GITHUB_REF_NAME ||
                         execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
      
      console.log(`📍 Current branch: ${branchName}`);

      // 2. Parse branch name to determine bump type
      const bumpType = parseBranchName(branchName);
      console.log(`🔍 Detected bump type: ${bumpType}`);

      // 3. Extract Jira ticket (optional)
      const jiraTicket = extractJiraTicket(branchName);
      if (jiraTicket) {
        console.log(`🎫 Jira ticket: ${jiraTicket}`);
      }

      // 4. Get current version and calculate new version
      const currentVersion = getCurrentVersion();
      const newVersion = bumpVersion(currentVersion, bumpType);
      console.log(`📦 Version bump: ${currentVersion} → ${newVersion}`);

      if (options.dryRun) {
        console.log('\n🏁 Dry run complete. No changes made.');
        return;
      }

      // 5. Update package.json
      updatePackageJson(newVersion);
      console.log(`✅ Updated package.json to ${newVersion}`);

      // 6. Generate and update changelog
      const changelogEntry = generateChangelogEntry(newVersion, branchName, jiraTicket);
      prependToChangelog(changelogEntry);
      console.log('✅ Updated CHANGELOG.md');

      // 7. Commit changes
      execSync('git add package.json CHANGELOG.md');
      execSync(`git commit -m "chore(release): v${newVersion} [skip ci]"`);
      console.log('✅ Committed version bump');

      // 8. Create git tag
      if (options.tag !== false) {
        const tagName = `v${newVersion}`;
        execSync(`git tag ${tagName}`);
        console.log(`✅ Created tag: ${tagName}`);

        // 9. Create Gitea release (if credentials provided)
        if (options.release !== false && process.env.GITEA_TOKEN) {
          const giteaUrl = process.env.GITEA_URL || 'https://gitea.example.com';
          const owner = process.env.REPO_OWNER;
          const repo = process.env.REPO_NAME;

          if (owner && repo) {
            const gitea = new GiteaClient(giteaUrl, process.env.GITEA_TOKEN);
            
            // Push tag first
            execSync(`git push origin ${tagName}`);
            
            // Create release
            await gitea.createRelease(
              owner,
              repo,
              tagName,
              `Release ${tagName}`,
              changelogEntry
            );
          } else {
            console.warn('⚠️  Skipping Gitea release: REPO_OWNER and REPO_NAME not set');
          }
        }
      }

      // 10. Stamp the version on the Jira ticket (optional)
      const jira = jiraFromEnv();
      if (jira && jiraTicket) {
        await jira.addLabel(jiraTicket, `v${newVersion}`);
      } else if (jiraTicket && !jira) {
        console.log('ℹ️  Jira not configured (set JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN), skipping label');
      }

      console.log('\n🎉 Release complete!');
      console.log(`📤 Don't forget to push: git push origin ${branchName} --tags`);

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();