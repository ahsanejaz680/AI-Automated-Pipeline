'use strict';

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');

async function sendEmail(story, qaReport, workDir) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_RECIPIENT } = process.env;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD.replace(/\s/g, ''),
    },
  });

  await transporter.verify();

  const subject = `QA Report — ${story.key} — ${qaReport.overallStatus}`;

  const attachments = [];

  // Attach screenshots
  for (const p of (qaReport.screenshotPaths || [])) {
    if (await fs.pathExists(p)) {
      attachments.push({ filename: path.basename(p), path: p });
    }
  }

  // Attach test results if present
  const testResultsPath = path.join(workDir, 'test-results.txt');
  if (await fs.pathExists(testResultsPath)) {
    attachments.push({ filename: 'test-results.txt', path: testResultsPath });
  }

  // Attach bug report markdown
  const bugReportPath = path.join(workDir, 'bug-report.md');
  if (await fs.pathExists(bugReportPath)) {
    attachments.push({ filename: 'bug-report.md', path: bugReportPath });
  }

  await transporter.sendMail({
    from: `AI Pipeline <${GMAIL_USER}>`,
    to: EMAIL_RECIPIENT,
    subject,
    text: qaReport.markdownReport,
    html: `<pre style="font-family:monospace;white-space:pre-wrap;">${qaReport.markdownReport}</pre>`,
    attachments,
  });

  logger.info(`[${story.key}] Email sent → ${EMAIL_RECIPIENT} | Subject: "${subject}"`);
}

module.exports = { sendEmail };
