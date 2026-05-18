'use strict';

const { httpRequest } = require('./http');
const logger = require('./logger');

const MAX_RETRIES = 4;
const MAX_WAIT_MS = 60_000; // never block longer than 60s per retry
const sleep = ms => new Promise(r => setTimeout(r, ms));

function retryWaitMs(headers, attempt) {
  const retryAfter = headers?.['retry-after'];
  const suggested = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(2 ** attempt * 5000, MAX_WAIT_MS);
  return Math.min(suggested, MAX_WAIT_MS);
}

async function groqChat({ model, messages, maxTokens = 4096, systemPrompt = null }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const resolvedModel = model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const body = {
    model: resolvedModel,
    max_tokens: maxTokens,
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data } = await httpRequest(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      return data.choices[0].message.content;
    } catch (err) {
      if (err.statusCode === 429 && attempt < MAX_RETRIES) {
        const waitMs = retryWaitMs(err.response?.headers, attempt);
        logger.warn(`Groq 429 — waiting ${waitMs / 1000}s (retry ${attempt}/${MAX_RETRIES - 1})...`);
        await sleep(waitMs);
        continue;
      }
      if (err.response?.data) {
        logger.error(`Groq error: ${JSON.stringify(err.response.data)}`);
      }
      throw err;
    }
  }
}

async function groqChatWithTools({ model, messages, tools = [], maxTokens = 4096, systemPrompt = null }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const resolvedModel = model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const body = {
    model: resolvedModel,
    max_tokens: maxTokens,
    messages: systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages,
  };
  if (tools.length) body.tools = tools;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data } = await httpRequest(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      return data.choices[0].message;
    } catch (err) {
      if (err.statusCode === 429 && attempt < MAX_RETRIES) {
        const waitMs = retryWaitMs(err.response?.headers, attempt);
        logger.warn(`Groq 429 — waiting ${waitMs / 1000}s (retry ${attempt}/${MAX_RETRIES - 1})...`);
        await sleep(waitMs);
        continue;
      }
      if (err.response?.data) {
        logger.error(`Groq error: ${JSON.stringify(err.response.data)}`);
      }
      throw err;
    }
  }
}

module.exports = { groqChat, groqChatWithTools };
