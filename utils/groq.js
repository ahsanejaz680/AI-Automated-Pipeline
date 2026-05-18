'use strict';

const { httpRequest } = require('./http');
const logger = require('./logger');

const MAX_RETRIES = 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Groq chat completions (OpenAI-compatible API).
 * Default model: llama-3.1-8b-instant (free tier).
 * Automatically retries on 429 rate-limit responses using Retry-After header.
 */
async function groqChat({ model, messages, maxTokens = 4096, systemPrompt = null }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const resolvedModel = model || process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

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
        // Respect Retry-After header if present, else exponential backoff
        const retryAfter = err.response?.headers?.['retry-after'];
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(2 ** attempt * 5000, 60000);
        logger.warn(`Groq rate limited (429) — waiting ${waitMs / 1000}s before retry ${attempt}/${MAX_RETRIES - 1}...`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Groq chat completions with tool/function calling support.
 * Returns the full message object so the caller can inspect tool_calls.
 */
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
      return data.choices[0].message; // full message with possible tool_calls
    } catch (err) {
      if (err.statusCode === 429 && attempt < MAX_RETRIES) {
        const retryAfter = err.response?.headers?.['retry-after'];
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(2 ** attempt * 5000, 60000);
        logger.warn(`Groq rate limited (429) — waiting ${waitMs / 1000}s before retry ${attempt}/${MAX_RETRIES - 1}...`);
        await sleep(waitMs);
        continue;
      }
      if (err.response?.data) {
        const detail = typeof err.response.data === 'object'
          ? JSON.stringify(err.response.data)
          : err.response.data;
        logger.error(`Groq error body: ${detail}`);
      }
      throw err;
    }
  }
}

module.exports = { groqChat, groqChatWithTools };
