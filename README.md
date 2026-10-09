# branch-release

Semantic versioning based on branch naming conventions.

Run one command, and it reads your current branch, picks a bump type from the
prefix, updates `package.json` + `CHANGELOG.md`, commits, tags, and
(optionally) creates a Gitea release and stamps the version on the Jira ticket.

## Branch → bump

| Branch prefix                     | Bump    |
| --------------------------------- | ------- |
| `breaking/`, `major/`             | major   |
| `feature/`, `feat/`, `release/`   | minor   |
| `bugfix/`, `fix/`, `hotfix/`      | patch   |
| anything else                     | patch (with a warning) |

A Jira key in the branch name (e.g. `feature/OMNISSIUM-123-add-export`) is
picked up automatically for the changelog and the Jira label.

## Run locally

```bash
npm install

# preview only — no files changed, no commit, no tag
node index.js release --dry-run

# real run: bumps, commits, tags, and pushes to origin
node index.js release
```

The tool pushes `HEAD` + tags itself via `git push origin HEAD --follow-tags`,
using whatever credentials your `origin` remote already has (your own locally,
the token-authenticated clone URL in CI).

Flags:

- `--dry-run` — show what would happen, change nothing
- `--no-tag` — bump + commit, skip the git tag
- `--no-release` — skip the Gitea release (still tags)
- `--no-package` — don't read/write `package.json`; the current version comes
  from the latest git tag. Use this for non-Node projects (e.g. C#) — you still
  get the git tag, Gitea release, and `CHANGELOG.md`.

## Environment variables

All optional. The matching step is skipped when its vars are unset.

| Var               | Used for                                             |
| ----------------- | --------------------------------------------------- |
| `GITEA_REF_NAME` / `GITHUB_REF_NAME` | Branch name (falls back to `git`) |
| `GITEA_TOKEN`     | Create the Gitea release                             |
| `GITEA_URL`       | Gitea base URL (default `https://gitea.example.com`)|
| `REPO_OWNER`      | Repo owner, for the Gitea release                   |
| `REPO_NAME`       | Repo name, for the Gitea release                    |
| `JIRA_URL`        | Jira base URL (e.g. `https://you.atlassian.net`)    |
| `JIRA_EMAIL`      | Jira account email                                  |
| `JIRA_API_TOKEN`  | Jira API token                                      |
| `ANTHROPIC_API_KEY` | Summarize commits into the changelog via Claude   |
| `OPENAI_API_KEY`  | Same, via OpenAI (used only if `ANTHROPIC_API_KEY` unset) |

Gitea release needs `GITEA_TOKEN` + `REPO_OWNER` + `REPO_NAME`.
Jira labeling needs `JIRA_URL` + `JIRA_EMAIL` + `JIRA_API_TOKEN`.
With no LLM key, the changelog falls back to a one-line entry from the branch name.
Missing any set just skips that step.

Optional model override: `ANTHROPIC_MODEL` (default `claude-opus-4-8`),
`OPENAI_MODEL` (default `gpt-4o-mini`).

## Gitea Actions

```yaml
# .gitea/workflows/release.yml
name: release
on:
  push:
    branches: [feature/**, feat/**, fix/**, bugfix/**, hotfix/**, release/**, breaking/**, major/**]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # full history so tags work
          token: ${{ secrets.GITEA_TOKEN }}
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: node index.js release
        env:
          GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
          GITEA_URL: ${{ secrets.GITEA_URL }}
          REPO_OWNER: ${{ github.repository_owner }}
          REPO_NAME: ${{ github.event.repository.name }}
          JIRA_URL: ${{ secrets.JIRA_URL }}
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
```

## GitHub Actions

```yaml
# .github/workflows/release.yml
name: release
on:
  push:
    branches: [feature/**, feat/**, fix/**, bugfix/**, hotfix/**, release/**, breaking/**, major/**]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: node index.js release --no-release   # Gitea release step is Gitea-only
        env:
          JIRA_URL: ${{ secrets.JIRA_URL }}
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
```

> The commit is made with `[skip ci]` in the message so the release commit
> doesn't trigger another run.
