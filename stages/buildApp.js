'use strict';

const path = require('path');
const fs = require('fs-extra');
const { groqChat } = require('../utils/groq');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are an expert web developer. Build a complete, working web application based on the requirements.

Output ONLY files using this exact delimiter format — no explanations, no markdown fences:
===FILE: filename===
<file content here>
===END===

Rules:
- index.html is the main entry point
- Put ALL JavaScript logic in app.js using CommonJS (module.exports = { ... }) so Jest can require() it
- index.html must use <script src="app.js"></script> — do NOT use type="module"
- app.js must NOT use import/export ES module syntax — use only var/let/const and module.exports
- App must work as a static site (no server, no build step required)
- Make all decisions without asking for clarification`;

function parseFiles(text) {
  const files = {};
  const re = /===FILE: (.+?)===\n([\s\S]*?)===END===/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    files[m[1].trim()] = m[2];
  }
  return files;
}

async function buildApp(story, workDir) {
  const appDir = path.join(workDir, 'app');
  await fs.ensureDir(appDir);

  logger.info(`[${story.key}] Sending requirements to Grok (build stage)...`);

  const response = await groqChat({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    systemPrompt: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Build this web application:\n\n${story.requirements}` },
    ],
    maxTokens: 8192,
  });

  logger.info(`[${story.key}] Grok responded (${response.length} chars)`);

  const files = parseFiles(response);
  if (!Object.keys(files).length) {
    throw new Error('Grok returned no files in the expected ===FILE=== format');
  }

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(appDir, filename);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    logger.info(`[${story.key}]   Written: ${filename} (${content.length} bytes)`);
  }

  return appDir;
}

module.exports = { buildApp, parseFiles };
