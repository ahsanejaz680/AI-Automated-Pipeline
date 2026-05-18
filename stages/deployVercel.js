'use strict';

const path = require('path');
const fs = require('fs-extra');
const { httpRequest } = require('../utils/http');
const logger = require('../utils/logger');

const VERCEL_API = 'https://api.vercel.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function vercelHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function collectFiles(dir, baseDir, list = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name.endsWith('.test.js')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await collectFiles(full, baseDir, list);
    } else {
      list.push({ relPath: path.relative(baseDir, full).replace(/\\/g, '/'), fullPath: full });
    }
  }
  return list;
}

async function deployToVercel(story, appDir) {
  const { VERCEL_TOKEN, VERCEL_PROJECT_NAME } = process.env;

  const fileList = await collectFiles(appDir, appDir);
  logger.info(`[${story.key}] Preparing ${fileList.length} file(s) for Vercel...`);

  // Inline file content directly in the deployment body — no separate upload step needed
  const deployFiles = [];
  for (const { relPath, fullPath } of fileList) {
    const content = await fs.readFile(fullPath, 'utf8');
    deployFiles.push({ file: relPath, data: content });
    logger.info(`[${story.key}]   + ${relPath}`);
  }

  logger.info(`[${story.key}] Creating Vercel deployment for project "${VERCEL_PROJECT_NAME}"...`);
  const { data: dep } = await httpRequest(`${VERCEL_API}/v13/deployments`, {
    method: 'POST',
    headers: vercelHeaders(VERCEL_TOKEN),
    body: {
      name: VERCEL_PROJECT_NAME,
      files: deployFiles,
      target: 'production',
      projectSettings: {
        framework: null,
        buildCommand: null,
        outputDirectory: null,
        installCommand: null,
        devCommand: null,
      },
    },
  });

  const deployId = dep.id;
  logger.info(`[${story.key}] Deployment ID: ${deployId} — polling for READY...`);

  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(10_000);
    const { data } = await httpRequest(`${VERCEL_API}/v13/deployments/${deployId}`, {
      headers: vercelHeaders(VERCEL_TOKEN),
    });
    const state = data.readyState || data.state;
    logger.info(`[${story.key}] Deployment state: ${state}`);

    if (state === 'READY') {
      const deployUrl = `https://${data.url}`;
      logger.info(`[${story.key}] Live: ${deployUrl}`);
      await healthCheck(deployUrl);
      return deployUrl;
    }
    if (state === 'ERROR' || state === 'CANCELED') {
      throw new Error(`Vercel deployment ${deployId} ended with state: ${state}`);
    }
  }

  throw new Error('Vercel deployment timed out after 10 minutes');
}

async function healthCheck(url) {
  const https = require('https');
  const http = require('http');

  for (let i = 0; i < 5; i++) {
    const reachable = await new Promise(resolve => {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, res => {
        res.resume(); // drain response
        // Any HTTP response means the server is up
        resolve(res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(10_000, () => { req.destroy(); resolve(false); });
    });

    if (reachable) {
      logger.info(`Health check OK: ${url}`);
      return;
    }
    logger.warn(`Health check attempt ${i + 1}/5 failed — retrying in 5s...`);
    await sleep(5_000);
  }
  throw new Error(`Health check failed for ${url}`);
}

module.exports = { deployToVercel };
