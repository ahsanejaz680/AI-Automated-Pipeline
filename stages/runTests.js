'use strict';

const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const { groqChat } = require('../utils/groq');
const { parseFiles } = require('./buildApp');
const logger = require('../utils/logger');

const PIPELINE_DIR = path.join(__dirname, '..');
const JEST_BIN = path.join(PIPELINE_DIR, 'node_modules', '.bin', 'jest');

const SYSTEM_PROMPT = `You are an expert test engineer. Write Jest unit tests for the provided web app.

Output exactly one file using this format:
===FILE: app.test.js===
<test content>
===END===

Strict rules:
- Use CommonJS only: require() and module.exports — never import/export
- Jest testEnvironment is jsdom
- Require functions from ./app.js using: const app = require('./app.js');
- Do NOT test DOM rendering — only test the exported functions from app.js
- Use describe / it / expect blocks`;

/**
 * Extract test code from the model response.
 * Tries ===FILE:=== delimiter, then markdown fences, then raw Jest content.
 */
function extractTestCode(response) {
  const files = parseFiles(response);
  if (files['app.test.js']) return files['app.test.js'];
  if (Object.keys(files).length > 0) return Object.values(files)[0];

  const fenceMatch = response.match(/```(?:javascript|js|typescript|ts)?\n([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1];

  if (response.includes('describe(') || response.includes('it(') || response.includes('test(')) {
    return response;
  }

  return null;
}

async function runTests(story, appDir, workDir) {
  const entries = await fs.readdir(appDir);
  const appCodeFull = (
    await Promise.all(
      entries
        .filter(f => !f.endsWith('.test.js'))
        .map(async f => `### ${f}\n${await fs.readFile(path.join(appDir, f), 'utf8')}`)
    )
  ).join('\n\n');

  const appCode = appCodeFull.slice(0, 4000);
  const reqSnippet = story.requirements.slice(0, 1500);

  const testFile = path.join(appDir, 'app.test.js');
  const resultsFile = path.join(workDir, 'test-results.txt');
  const MAX = 3;
  let lastError = '';
  let lastTestContent = '';

  for (let i = 0; i < MAX; i++) {
    logger.info(`[${story.key}] Test iteration ${i + 1}/${MAX}`);

    // Build prompt — on retry include the failing tests and the error
    const userMsg = i === 0
      ? `Write tests for this app.\n\nRequirements:\n${reqSnippet}\n\nApp code:\n${appCode}`
      : `The tests failed. Fix them.\n\nApp code:\n${appCode}\n\nFailing tests:\n${lastTestContent.slice(0, 1500)}\n\nJest error output:\n${lastError.slice(0, 800)}`;

    const response = await groqChat({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
      maxTokens: 3000,
    });

    const testContent = extractTestCode(response);

    if (!testContent) {
      logger.warn(`[${story.key}] Iteration ${i + 1}: model returned no recognisable test code — retrying...`);
      lastError = 'Model returned no test code';
      continue; // retry, don't give up
    }

    lastTestContent = testContent;
    await fs.writeFile(testFile, testContent);

    try {
      const output = execSync(
        `"${JEST_BIN}" "${testFile}" --testEnvironment jsdom --rootDir "${appDir}" --no-coverage 2>&1`,
        { encoding: 'utf8', timeout: 60000 }
      );
      logger.info(`[${story.key}] ✅ All tests passed!`);
      await fs.writeFile(resultsFile, output);
      return;
    } catch (err) {
      lastError = (err.stdout || '') + (err.stderr || '') || err.message;
      logger.warn(`[${story.key}] Tests failed (iteration ${i + 1}):\n${lastError.slice(0, 600)}`);
    }
  }

  // Save whatever we have and continue — don't block the rest of the pipeline
  await fs.writeFile(resultsFile, `Tests did not pass after ${MAX} iterations.\n\nLast error:\n${lastError}`);
  logger.warn(`[${story.key}] Tests did not pass after ${MAX} iterations — continuing pipeline`);
}

module.exports = { runTests };
