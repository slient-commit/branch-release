#!/usr/bin/env node

const { program } = require('commander');
const { parseBranchName, extractJiraTicket } = require('./src/branch-parser');
const { getCurrentVersion, getVersionFromGitTag, bumpVersion, updatePackageJson } = require('./src/version-bumper');
const { GiteaClient } = require('./src/gitea-client');
const { jiraFromEnv } = require('./src/jira-client');
const { generateChangelogEntry, prependToChangelog } = require('./src/changelog-generator');
const { execSync } = require('child_process');
const fs = require('fs');

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
  .option('--no-package', 'Skip reading/writing package.json (version comes from the latest git tag)')
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

      // 4. Get current version and calculate new version. Without a package.json
      // (e.g. a C# project) the version is tracked by git tags instead.
      const currentVersion = options.package === false
        ? getVersionFromGitTag()
        : getCurrentVersion();
      const newVersion = bumpVersion(currentVersion, bumpType);
      console.log(`📦 Version bump: ${currentVersion} → ${newVersion}`);

      if (options.dryRun) {
        console.log('\n🏁 Dry run complete. No changes made.');
        return;
      }

      // 5. Update package.json (unless --no-package)
      if (options.package !== false) {
        updatePackageJson(newVersion);
        console.log(`✅ Updated package.json to ${newVersion}`);
      }

      // 6. Generate and update changelog (commits since last tag, for LLM summary)
      let commits = '';
      try {
        // stderr ignored: git prints a fatal when no tags exist yet (handled below)
        const lastTag = execSync('git describe --tags --abbrev=0', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
        commits = execSync(`git log ${lastTag}..HEAD --pretty=format:%s`).toString().trim();
      } catch {
        // No tags yet — summarize all commits
        commits = execSync('git log --pretty=format:%s').toString().trim();
      }
      const changelogEntry = await generateChangelogEntry(newVersion, branchName, jiraTicket, commits);
      prependToChangelog(changelogEntry);
      console.log('✅ Updated CHANGELOG.md');

      // 7. Commit changes. CI runners often have no git identity, so set one
      // for the commit + annotated tag (override via GIT_AUTHOR_NAME/EMAIL).
      const gitName = process.env.GIT_AUTHOR_NAME || 'branch-release';
      const gitEmail = process.env.GIT_AUTHOR_EMAIL || 'branch-release@users.noreply.github.com';
      const gitId = `-c user.name="${gitName}" -c user.email="${gitEmail}"`;
      const files = ['CHANGELOG.md'];
      if (options.package !== false) {
        files.unshift('package.json');
        if (fs.existsSync('package-lock.json')) files.push('package-lock.json');
      }
      execSync(`git add ${files.join(' ')}`);
      execSync(`git ${gitId} commit -m "chore(release): v${newVersion} [skip ci]"`);
      console.log('✅ Committed version bump');

      // 8. Create git tag (annotated, so --follow-tags pushes it)
      const tagName = `v${newVersion}`;
      if (options.tag !== false) {
        execSync(`git ${gitId} tag -a ${tagName} -m "Release ${tagName}"`);
        console.log(`✅ Created tag: ${tagName}`);
      }

      // 9. Push branch + tags. origin is already authenticated — CI clones with
      // a token in the URL, locally the dev's own credentials apply.
      const pushArgs = options.tag !== false ? ' --follow-tags' : '';
      execSync(`git push origin HEAD${pushArgs}`, { stdio: 'inherit' });
      console.log('✅ Pushed to origin');

      // 10. Create Gitea release (if credentials provided; needs the tag pushed above)
      if (options.tag !== false && options.release !== false && process.env.GITEA_TOKEN) {
        const giteaUrl = process.env.GITEA_URL || 'https://gitea.example.com';
        const owner = process.env.REPO_OWNER;
        const repo = process.env.REPO_NAME;

        if (owner && repo) {
          const gitea = new GiteaClient(giteaUrl, process.env.GITEA_TOKEN);
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

      // 10. Stamp the version on the Jira ticket (optional)
      const jira = jiraFromEnv();
      if (jira && jiraTicket) {
        await jira.addLabel(jiraTicket, `v${newVersion}`);
      } else if (jiraTicket && !jira) {
        console.log('ℹ️  Jira not configured (set JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN), skipping label');
      }

      console.log('\n🎉 Release complete!');

    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();