'use strict';

require('dotenv').config();
const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');
const { httpRequest } = require('./utils/http');

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';

function result(label, ok, detail) {
  const status = ok ? PASS : FAIL;
  const msg = detail ? `  → ${detail}` : '';
  console.log(`  ${status}  ${label}${msg}`);
  return ok;
}

async function checkJira() {
  console.log('\n🔵 Jira');
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY } = process.env;
  const auth = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  try {
    // Check auth & project exists
    const { data } = await httpRequest(
      `${JIRA_BASE_URL}/rest/api/3/project/${JIRA_PROJECT_KEY}`,
      { headers: { Authorization: auth, Accept: 'application/json' } }
    );
    result('Authentication', true, `Logged in as ${JIRA_EMAIL}`);
    result('Project found', true, `${data.key} — "${data.name}"`);

    // Use the new POST /search/jql endpoint (old GET /search returns 410)
    const { data: search } = await httpRequest(
      `${JIRA_BASE_URL}/rest/api/3/search/jql`,
      {
        method: 'POST',
        headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: {
          jql: `project = ${JIRA_PROJECT_KEY} AND labels = "ai-ready" AND status = "To Do"`,
          maxResults: 5,
          fields: ['summary', 'status'],
        },
      }
    );
    const count = (search.issues || []).length;
    result(
      'Search API (POST /search/jql)',
      true,
      count > 0 ? `${count} ai-ready story(s) ready to process` : 'No ai-ready stories yet — create one to test the pipeline'
    );
  } catch (err) {
    result('Connection', false, err.message);
  }
}

async function checkGitHub() {
  console.log('\n🐙 GitHub');
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;

  const ghHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ai-pipeline/1.0',
  };

  try {
    // Check repo access directly (token may not have read:user scope)
    const { data: repo } = await httpRequest(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
      { headers: ghHeaders }
    );
    result('Authentication', true, `Token valid`);
    result('Repo accessible', true, `${repo.full_name} (${repo.private ? 'private' : 'public'})`);
    result('Push permission', repo.permissions?.push === true, repo.permissions?.push ? 'write access confirmed' : 'no write access — token needs repo scope');
  } catch (err) {
    result('Connection', false, err.message);
  }
}

async function checkVercel() {
  console.log('\n▲ Vercel');
  const { VERCEL_TOKEN, VERCEL_PROJECT_NAME } = process.env;

  try {
    // Check token
    const { data: user } = await httpRequest('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    result('Authentication', true, `Logged in as ${user.user?.username || user.user?.email}`);

    // Check if project exists (it may not yet — that's fine)
    try {
      const { data: proj } = await httpRequest(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_NAME}`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      result('Project', true, `"${proj.name}" already exists — deployments will update it`);
    } catch (err) {
      if (err.statusCode === 404) {
        result('Project', true, `"${VERCEL_PROJECT_NAME}" not yet created — will be auto-created on first deploy`);
      } else {
        throw err;
      }
    }
  } catch (err) {
    result('Connection', false, err.message);
  }
}

async function checkEmail() {
  console.log('\n📧 Gmail SMTP');
  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_RECIPIENT } = process.env;

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD.replace(/\s/g, ''),
      },
    });
    await transporter.verify();
    result('SMTP connection', true, `Authenticated as ${GMAIL_USER}`);
    result('Recipient configured', true, `Will send to ${EMAIL_RECIPIENT}`);
  } catch (err) {
    result('SMTP connection', false, err.message);
  }
}

async function checkGrok() {
  console.log('\n🤖 Groq (llama-3.1-8b-instant)');
  const { GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL } = process.env;
  const base = GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = GROQ_MODEL || 'llama-3.1-8b-instant';

  try {
    const { data } = await httpRequest(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: {
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Reply with the word PONG only.' }],
      },
    });
    const reply = data.choices?.[0]?.message?.content?.trim() || '(no reply)';
    result('Authentication', true, 'API key valid');
    result('Chat completions', true, `${model} responded: "${reply}"`);
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.response?.data?.error || err.message;
    result('Connection', false, String(detail).slice(0, 120));
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log(' Zero Human Touch Pipeline — Connection Check');
  console.log('='.repeat(50));

  await checkJira();
  await checkGitHub();
  await checkVercel();
  await checkEmail();
  await checkGrok();

  console.log('\n' + '='.repeat(50));
  console.log(' Done. Fix any ❌ before running the pipeline.');
  console.log('='.repeat(50) + '\n');
}

main().catch(err => { console.error('Check script crashed:', err.message); process.exit(1); });
