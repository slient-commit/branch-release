/**
 * Minimal Jira Cloud client. Only used when Jira credentials are set.
 */
class JiraClient {
  constructor(baseUrl, email, token) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.auth = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
  }

  /**
   * Adds a label to a Jira issue (used to stamp the released version).
   * @param {string} issueKey - e.g. "OMNISSIUM-123"
   * @param {string} label - e.g. "v1.2.3" (Jira labels cannot contain spaces)
   */
  async addLabel(issueKey, label) {
    const safeLabel = label.replace(/\s+/g, '-');
    const url = `${this.baseUrl}/rest/api/3/issue/${issueKey}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': this.auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        update: { labels: [{ add: safeLabel }] },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to label ${issueKey}: ${response.status} - ${error}`);
    }

    console.log(`✅ Labeled ${issueKey} with ${safeLabel}`);
  }
}

/**
 * Builds a JiraClient from env vars, or null if Jira is not configured.
 * Needs JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN.
 */
function jiraFromEnv() {
  const { JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) return null;
  return new JiraClient(JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN);
}

module.exports = { JiraClient, jiraFromEnv };
