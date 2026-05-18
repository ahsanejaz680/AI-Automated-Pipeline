'use strict';

const { transitionIssue, addComment } = require('../utils/jiraApi');
const logger = require('../utils/logger');

async function closeJira(story, qaReport, deployUrl) {
  const { passed, overallStatus, markdownReport } = qaReport;

  if (passed) {
    await transitionIssue(story.key, 'Done');
    await addComment(
      story.key,
      `✅ Pipeline completed successfully!\n\nDeployment URL: ${deployUrl}\nQA Status: ${overallStatus}\n\n${markdownReport.slice(0, 2000)}`
    );
    logger.info(`[${story.key}] Jira → Done`);
  } else {
    // Try "Bug Reported" first, then fall back to other terminal states
    let transitioned = false;
    for (const status of ['Bug Reported', 'IN REVIEW', 'In Review', 'IN QA', 'In QA', 'Code Review']) {
      try {
        await transitionIssue(story.key, status);
        transitioned = true;
        break;
      } catch {}
    }
    if (!transitioned) logger.error(`[${story.key}] Could not transition Jira issue — stuck in progress`);

    await addComment(
      story.key,
      `❌ QA found issues.\n\nDeployment URL: ${deployUrl || 'N/A'}\nQA Status: ${overallStatus}\n\n${markdownReport.slice(0, 2000)}`
    );
    logger.info(`[${story.key}] Jira → Bug Reported / In Review`);
  }
}

module.exports = { closeJira };
