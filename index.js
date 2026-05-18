'use strict';

require('dotenv').config();
const cron = require('node-cron');
const { runPipeline } = require('./orchestrator');
const logger = require('./utils/logger');

logger.info('🚀 Zero Human Touch Pipeline started');
logger.info('Cron: every 5 minutes | Run "node index.js" to start');

// Run once immediately on startup so you can test without waiting 5 min
runPipeline().catch(err => logger.error('Initial run error:', err.message));

// Schedule every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  logger.info('⏱  Cron tick — polling Jira...');
  try {
    await runPipeline();
  } catch (err) {
    logger.error('Unhandled pipeline error:', err.message);
  }
});
