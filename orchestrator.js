'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs-extra');

const { pollJira } = require('./stages/jiraPoll');
const { buildApp } = require('./stages/buildApp');
const { runTests } = require('./stages/runTests');
const { pushToGitHub } = require('./stages/pushGitHub');
const { deployToVercel } = require('./stages/deployVercel');
const { runQA } = require('./stages/runQA');
const { sendEmail } = require('./stages/sendEmail');
const { closeJira } = require('./stages/closeJira');
const { transitionIssue, addComment } = require('./utils/jiraApi');
const logger = require('./utils/logger');

// Which Jira status to use when a stage fails
const FAILURE_STATUS = {
  build:  'To Do',    // development error → back to To Do for retry
  tests:  'To Do',
  github: 'To Do',
  vercel: 'To Do',
  qa:     'IN QA',    // QA error → IN QA
  email:  'IN QA',
};

async function handleFailure(story, err, stage, deployUrl, workDir) {
  logger.error(`[${story.key}] ❌ Pipeline error at stage "${stage}": ${err.message}`);
  logger.error(err.stack);

  const targetStatus = FAILURE_STATUS[stage] || 'To Do';

  try {
    await transitionIssue(story.key, targetStatus);
  } catch (transErr) {
    logger.error(`[${story.key}] Could not transition to "${targetStatus}": ${transErr.message}`);
  }

  const comment = `❌ Pipeline failed at stage: *${stage}*\n\nError: ${err.message}\n\nDeployment URL: ${deployUrl || 'N/A'}`;
  await addComment(story.key, comment).catch(() => {});

  // Send failure email if possible
  try {
    const errorReport = {
      passed: false,
      overallStatus: 'FAIL',
      summary: `Pipeline failed at stage "${stage}": ${err.message}`,
      markdownReport: `# Pipeline Error — ${story.key}\n\n**Stage:** ${stage}\n**Error:** ${err.message}\n\n\`\`\`\n${err.stack}\n\`\`\``,
      screenshotPaths: [],
    };
    const { sendEmail } = require('./stages/sendEmail');
    await sendEmail(story, errorReport, workDir).catch(() => {});
  } catch {}
}

async function runPipeline() {
  const stories = await pollJira();

  if (!stories.length) {
    logger.info('No new stories — sleeping until next tick');
    return;
  }

  for (const story of stories) {
    const workDir = path.join(os.tmpdir(), 'ai-pipeline', story.key);
    await fs.ensureDir(workDir);

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`[${story.key}] START: "${story.summary}"`);
    logger.info('='.repeat(60));

    let deployUrl = null;
    let currentStage = 'build';

    try {
      // Stage 2 — Build
      logger.info(`[${story.key}] Stage 2: Build`);
      currentStage = 'build';
      const appDir = await buildApp(story, workDir);

      // Stage 3 — Unit tests
      logger.info(`[${story.key}] Stage 3: Unit tests`);
      currentStage = 'tests';
      await runTests(story, appDir, workDir);

      // Stage 4 — GitHub PR
      logger.info(`[${story.key}] Stage 4: GitHub`);
      currentStage = 'github';
      const { prUrl } = await pushToGitHub(story, appDir);
      logger.info(`[${story.key}] PR: ${prUrl}`);

      // Stage 5 — Vercel deploy
      logger.info(`[${story.key}] Stage 5: Vercel deploy`);
      currentStage = 'vercel';
      deployUrl = await deployToVercel(story, appDir);

      // Stage 6 — QA
      logger.info(`[${story.key}] Stage 6: QA`);
      currentStage = 'qa';
      const qaReport = await runQA(story, deployUrl, workDir);

      // Stage 7 — Email
      logger.info(`[${story.key}] Stage 7: Email`);
      currentStage = 'email';
      await sendEmail(story, qaReport, workDir);

      // Stage 8 — Close Jira loop
      logger.info(`[${story.key}] Stage 8: Close Jira`);
      await closeJira(story, qaReport, deployUrl);

      logger.info(`[${story.key}] ✅ Pipeline complete`);
    } catch (err) {
      await handleFailure(story, err, currentStage, deployUrl, workDir);
    }
  }
}

module.exports = { runPipeline };
