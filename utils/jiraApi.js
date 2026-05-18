'use strict';

const { httpRequest } = require('./http');
const logger = require('./logger');

function authHeader() {
  const { JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  return 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
}

function jiraHeaders() {
  return {
    Authorization: authHeader(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function jiraUrl(path) {
  return `${process.env.JIRA_BASE_URL}${path}`;
}

async function jiraGet(path) {
  const { data } = await httpRequest(jiraUrl(path), { headers: jiraHeaders() });
  return data;
}

async function jiraPost(path, body) {
  const { data } = await httpRequest(jiraUrl(path), {
    method: 'POST',
    headers: jiraHeaders(),
    body,
  });
  return data;
}

async function transitionIssue(issueKey, targetStatus) {
  const { transitions } = await jiraGet(`/rest/api/3/issue/${issueKey}/transitions`);

  let t = transitions.find(x => x.name.toLowerCase() === targetStatus.toLowerCase());

  if (!t) {
    const available = transitions.map(x => x.name).join(', ');
    logger.warn(`[${issueKey}] Transition "${targetStatus}" not found. Available: ${available}`);

    for (const fb of ['done', 'in review', 'code review', 'in progress']) {
      t = transitions.find(x => x.name.toLowerCase().includes(fb));
      if (t) break;
    }
    if (!t) throw new Error(`No valid transition found for "${targetStatus}" on ${issueKey}`);
    logger.warn(`[${issueKey}] Using fallback transition: "${t.name}"`);
  }

  await jiraPost(`/rest/api/3/issue/${issueKey}/transitions`, { transition: { id: t.id } });
  logger.info(`[${issueKey}] Transitioned → "${t.name}"`);
}

async function addComment(issueKey, text) {
  await jiraPost(`/rest/api/3/issue/${issueKey}/comment`, {
    body: {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    },
  });
  logger.info(`[${issueKey}] Comment added`);
}

module.exports = { authHeader, jiraGet, jiraPost, transitionIssue, addComment };
