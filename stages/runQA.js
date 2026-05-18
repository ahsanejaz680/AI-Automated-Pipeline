'use strict';

const path = require('path');
const fs = require('fs-extra');
const { Client } = require('@modelcontextprotocol/sdk/client');
// Resolve stdio transport via the known-good client/index.js resolution
const { StdioClientTransport } = require(
  path.join(path.dirname(require.resolve('@modelcontextprotocol/sdk/client')), 'stdio.js')
);
const { groqChatWithTools } = require('../utils/groq');
const logger = require('../utils/logger');

const MAX_AGENT_TURNS = 20;

// @playwright/mcp requires Node >=18. If we're running on <18, find the nvm Node 20 binary.
function resolveNodeBin() {
  const ver = parseInt(process.versions.node.split('.')[0], 10);
  if (ver >= 18) return process.execPath;
  const candidates = [
    `${process.env.HOME}/.nvm/versions/node/v20.19.5/bin/node`,
    `${process.env.HOME}/.nvm/versions/node/v20.12.0/bin/node`,
    `${process.env.HOME}/.nvm/versions/node/v18.20.0/bin/node`,
  ];
  const { existsSync } = require('fs');
  const found = candidates.find(p => existsSync(p));
  if (found) return found;
  throw new Error('Node >=18 required for Playwright MCP but none found. Run: nvm use 20');
}

async function runQA(story, deployUrl, workDir) {
  const screenshotsDir = path.join(workDir, 'screenshots');
  await fs.ensureDir(screenshotsDir);

  logger.info(`[${story.key}] Starting Playwright MCP QA agent for ${deployUrl}...`);

  // Resolve the playwright-mcp binary
  const mcpBin = path.join(
    path.dirname(require.resolve('@playwright/mcp')),
    'cli.js'
  );

  const nodeBin = resolveNodeBin();
  const transport = new StdioClientTransport({
    command: nodeBin,
    args: [mcpBin, '--headless', '--viewport-size', '375,812'],
  });

  const client = new Client({ name: 'qa-agent', version: '1.0.0' });
  await client.connect(transport);

  const { tools: mcpTools } = await client.listTools();
  logger.info(`[${story.key}] MCP connected — ${mcpTools.length} browser tools available`);

  // Only expose the tools needed for QA — keeps the payload small and Groq happy
  const ALLOWED_TOOLS = new Set([
    'browser_navigate', 'browser_click', 'browser_type', 'browser_fill_form',
    'browser_select_option', 'browser_snapshot', 'browser_take_screenshot',
    'browser_wait_for', 'browser_evaluate', 'browser_console_messages',
    'browser_press_key',
  ]);

  const openaiTools = mcpTools
    .filter(t => ALLOWED_TOOLS.has(t.name))
    .map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description || '',
        parameters: t.inputSchema || { type: 'object', properties: {} },
      },
    }));

  // Synthetic "done" tool so the model can submit its final report
  const doneTool = {
    type: 'function',
    function: {
      name: 'done',
      description: 'Call this when all testing is complete to submit the final QA report',
      parameters: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                criterion: { type: 'string' },
                passed: { type: 'boolean' },
                notes: { type: 'string' },
              },
              required: ['criterion', 'passed'],
            },
          },
          summary: { type: 'string' },
          consoleErrors: { type: 'array', items: { type: 'string' } },
        },
        required: ['results', 'summary'],
      },
    },
  };

  const allTools = [...openaiTools, doneTool];
  const criteria = extractCriteria(story.requirements);

  const systemPrompt = `You are a QA engineer testing a web application.

Your job:
1. Navigate to ${deployUrl}
2. Test each acceptance criterion by interacting with the UI
3. Take screenshots at key moments
4. When done testing all criteria, call done() with your structured report

Acceptance criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Use browser_navigate, browser_click, browser_type, browser_snapshot, and browser_take_screenshot.
Always call done() at the end with your findings.`;

  const messages = [
    {
      role: 'user',
      content: `Test the app at ${deployUrl} against all acceptance criteria, then call done() with your report.`,
    },
  ];

  let screenshotIndex = 1;
  let finalReport = null;

  try {
    for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
      logger.info(`[${story.key}] Agent turn ${turn + 1}/${MAX_AGENT_TURNS}`);

      const assistantMsg = await groqChatWithTools({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages,
        tools: allTools,
        maxTokens: 2048,
        systemPrompt,
      });

      // Groq rejects null content in history — normalise to empty string
      if (assistantMsg.content === null || assistantMsg.content === undefined) {
        assistantMsg.content = '';
      }
      messages.push(assistantMsg);

      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        logger.info(`[${story.key}] Agent returned no tool calls — ending loop`);
        break;
      }

      let isDone = false;

      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs;
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          fnArgs = {};
        }

        if (fnName === 'done') {
          finalReport = fnArgs;
          isDone = true;
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: 'QA report received.',
          });
          break;
        }

        logger.info(`[${story.key}]   → ${fnName}(${JSON.stringify(fnArgs).slice(0, 120)})`);
        let toolResult;
        try {
          const mcpResult = await client.callTool({ name: fnName, arguments: fnArgs });
          let resultText = '';
          for (const block of mcpResult.content || []) {
            if (block.type === 'text') {
              resultText += block.text;
            } else if (block.type === 'image') {
              const shotName = `screenshot-${String(screenshotIndex++).padStart(2, '0')}.png`;
              const shotPath = path.join(screenshotsDir, shotName);
              const raw = block.data || '';
              await fs.writeFile(shotPath, Buffer.from(raw, 'base64'));
              resultText += `[Screenshot: ${shotName}]`;
              logger.info(`[${story.key}]   Saved ${shotName}`);
            }
          }
          toolResult = resultText || 'OK';
        } catch (err) {
          toolResult = `Error: ${err.message}`;
          logger.warn(`[${story.key}]   Tool ${fnName} failed: ${err.message}`);
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: String(toolResult).slice(0, 2000),
        });
      }

      if (isDone) break;
    }
  } finally {
    await client.close().catch(() => {});
  }

  const testResults = buildTestResults(finalReport, criteria);
  const overallStatus = testResults.every(r => r.result === 'PASS')
    ? 'PASS'
    : testResults.some(r => r.result === 'PASS') ? 'PARTIAL' : 'FAIL';

  const screenshotFiles = await fs.readdir(screenshotsDir).catch(() => []);
  const consoleErrors = finalReport?.consoleErrors || [];
  const reportMd = buildReport(story, deployUrl, overallStatus, testResults, consoleErrors, screenshotFiles);
  await fs.writeFile(path.join(workDir, 'bug-report.md'), reportMd);
  logger.info(`[${story.key}] QA complete — ${overallStatus}`);

  return {
    passed: overallStatus === 'PASS',
    overallStatus,
    summary: `${testResults.filter(r => r.result === 'PASS').length}/${testResults.length} criteria passed`,
    markdownReport: reportMd,
    screenshotPaths: screenshotFiles.map(f => path.join(screenshotsDir, f)),
    reportPath: path.join(workDir, 'bug-report.md'),
  };
}

function buildTestResults(finalReport, criteria) {
  if (finalReport && Array.isArray(finalReport.results) && finalReport.results.length > 0) {
    return finalReport.results.map(r => ({
      criterion: r.criterion,
      result: r.passed ? 'PASS' : 'FAIL',
      notes: r.notes || '',
    }));
  }
  return criteria.map(c => ({ criterion: c, result: 'FAIL', notes: 'Agent did not produce structured results' }));
}

function extractCriteria(requirements) {
  const criteria = [];
  let inSection = false;
  for (const line of requirements.split('\n')) {
    const lower = line.toLowerCase();
    if (lower.includes('acceptance criteria') || lower.includes('## features')) { inSection = true; continue; }
    if (inSection && line.startsWith('#')) { inSection = false; continue; }
    if (inSection && line.trim().startsWith('-')) criteria.push(line.trim().replace(/^-\s+/, ''));
  }
  return criteria.length ? criteria : ['Page loads without errors', 'Core functionality works'];
}

function buildReport(story, url, status, results, errors, shots) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const rows = results.map(r =>
    `| ${r.criterion} | ${r.result === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.notes || ''} |`
  ).join('\n');
  const errSection = errors.length ? errors.map(e => `- ${e}`).join('\n') : '- None';
  const shotSection = shots.length ? shots.map(f => `- ${f}`).join('\n') : '- No screenshots captured';
  const p = results.filter(r => r.result === 'PASS').length;

  return `# QA Report — ${story.key}
**Deployment URL:** ${url}
**Tested at:** ${now}
**Overall status:** ${status}

## Test Results
| Acceptance Criterion | Result | Notes |
|----------------------|--------|-------|
${rows}

## Console Errors
${errSection}

## Screenshots
${shotSection}

## Summary
${p}/${results.length} acceptance criteria passed. ${
    status === 'PASS' ? 'All tests passed — application is functioning correctly.' :
    status === 'PARTIAL' ? 'Some tests failed — application has issues that need attention.' :
    'All tests failed — application has critical issues.'
  }
`;
}

module.exports = { runQA };
