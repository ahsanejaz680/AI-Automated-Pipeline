'use strict';

const { httpRequest } = require('../utils/http');
const { authHeader, jiraPost, transitionIssue } = require('../utils/jiraApi');
const logger = require('../utils/logger');

async function pollJira() {
  const { JIRA_PROJECT_KEY } = process.env;

  logger.info(`Polling Jira for ai-ready stories...`);

  // Atlassian deprecated GET /search — use the new POST /search/jql endpoint
  const data = await jiraPost('/rest/api/3/search/jql', {
    jql: `project = ${JIRA_PROJECT_KEY} AND labels = "ai-ready" AND status = "To Do"`,
    maxResults: 10,
    fields: ['summary', 'status', 'attachment', 'description'],
  });

  if (!data.issues.length) return [];

  logger.info(`Found ${data.issues.length} story(s)`);

  const stories = [];

  for (const issue of data.issues) {
    logger.info(`[${issue.key}] "${issue.fields.summary}"`);

    const attachments = issue.fields.attachment || [];
    const reqFile = attachments.find(a => a.filename === 'requirements.md');

    if (!reqFile) {
      logger.warn(`[${issue.key}] No requirements.md attachment — skipping`);
      continue;
    }

    logger.info(`[${issue.key}] Downloading requirements.md...`);
    // Attachment download may redirect — httpRequest follows redirects automatically
    const { data: reqBuf } = await httpRequest(reqFile.content, {
      headers: { Authorization: authHeader() },
    });
    const requirements = Buffer.isBuffer(reqBuf) ? reqBuf.toString() : String(reqBuf);

    // Transition immediately so next cron tick won't re-pick this story
    await transitionIssue(issue.key, 'In Progress');

    stories.push({ key: issue.key, summary: issue.fields.summary, requirements });
  }

  return stories;
}

module.exports = { pollJira };
