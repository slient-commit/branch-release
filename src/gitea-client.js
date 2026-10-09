class GiteaClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = token;
  }

  /**
   * Creates a git tag
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} tagName - Tag name (e.g., "v1.2.3")
   * @param {string} targetCommitish - Commit SHA or branch to tag
   */
  async createTag(owner, repo, tagName, targetCommitish) {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/tags`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: tagName,
        target_commitish: targetCommitish,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create tag: ${response.status} - ${error}`);
    }

    console.log(`✅ Created tag: ${tagName}`);
  }

  /**
   * Creates a Gitea release
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} tagName - Tag name
   * @param {string} name - Release title
   * @param {string} body - Release notes (markdown)
   */
  async createRelease(owner, repo, tagName, name, body) {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/releases`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: name,
        body: body,
        draft: false,
        prerelease: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create release: ${response.status} - ${error}`);
    }

    const release = await response.json();
    console.log(`✅ Created release: ${release.html_url}`);
    return release;
  }
}

module.exports = { GiteaClient };