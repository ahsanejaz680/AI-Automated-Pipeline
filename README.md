# AI-Automated-Pipeline

A fully automated, zero-human-touch software delivery pipeline that takes a Jira story from **"To Do"** all the way to a **live Vercel deployment** with a QA report and email notification — no manual steps required.

## What it does

The pipeline polls Jira every 5 minutes for stories labelled `ai-ready`. When one is found, it automatically:

1. **Picks up the story** — downloads `requirements.md` from the Jira attachment and transitions the story to "In Progress"
2. **Builds the app** — sends the requirements to Groq (LLaMA 3.3 70B) which generates a complete static web app (`index.html` + `app.js`)
3. **Runs unit tests** — generates Jest tests via Groq, runs them with jsdom, and retries up to 3 times if they fail
4. **Opens a GitHub PR** — creates a feature branch, commits the generated app, and opens a pull request
5. **Deploys to Vercel** — deploys the app and waits for it to go live
6. **Runs QA** — launches an agentic Playwright MCP browser session driven by Groq to test each acceptance criterion against the live URL, capturing screenshots
7. **Sends an email report** — emails the QA bug report with screenshots and test results to the configured recipient
8. **Closes the Jira loop** — transitions the story to "Done" (or the appropriate failure status if something went wrong)

## Architecture

```
Jira (poll every 5 min)
  └── requirements.md
        └── Groq LLaMA 3.3 70B
              ├── Build: index.html + app.js
              ├── Tests: app.test.js (Jest + jsdom)
              └── QA plan + result analysis
                    ├── GitHub PR
                    ├── Vercel deployment
                    ├── Playwright MCP (agentic browser)
                    ├── Email report (nodemailer / Gmail)
                    └── Jira status update
```

## Tech stack

| Concern | Tool |
|---|---|
| Language | Node.js 20 (CommonJS) |
| AI agent | Groq API — `llama-3.3-70b-versatile` |
| Browser automation | Playwright + `@playwright/mcp` |
| Unit tests | Jest + `jest-environment-jsdom` |
| Version control | GitHub REST API + `simple-git` |
| Deployment | Vercel REST API v13 |
| Email | nodemailer (Gmail SMTP) |
| Scheduling | `node-cron` |

## Project structure

```
pipeline/
├── index.js              # Entry point — runs pipeline + cron scheduler
├── orchestrator.js       # Stage sequencing and failure handling
├── stages/
│   ├── jiraPoll.js       # Jira polling and story pickup
│   ├── buildApp.js       # AI-generated web app
│   ├── runTests.js       # AI-generated unit tests
│   ├── pushGitHub.js     # GitHub branch + PR creation
│   ├── deployVercel.js   # Vercel deployment + health check
│   ├── runQA.js          # Playwright MCP agentic QA
│   ├── sendEmail.js      # Email report delivery
│   └── closeJira.js      # Jira story closure
└── utils/
    ├── groq.js           # Groq API client (chat + tool calling)
    ├── http.js           # HTTP client (Node built-ins, no axios)
    ├── jiraApi.js        # Jira REST API helpers
    └── logger.js         # Timestamped logger
```

## Setup

### Prerequisites

- Node.js 20+ (required by `@playwright/mcp`)
- A Groq API key (free tier at [console.groq.com](https://console.groq.com))
- A Jira Cloud project with stories labelled `ai-ready` and a `requirements.md` attachment
- A GitHub personal access token (repo scope)
- A Vercel token and project
- A Gmail account with an App Password enabled

### Installation

```bash
git clone https://github.com/ahsanejaz680/AI-Automated-Pipeline.git
cd AI-Automated-Pipeline
npm install
npm run install-browsers   # installs Chromium for Playwright
```

### Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your_jira_token
JIRA_PROJECT_KEY=QC

GITHUB_TOKEN=ghp_...
GITHUB_OWNER=your_github_username
GITHUB_REPO=AI-Automated-Pipeline

VERCEL_TOKEN=vcp_...
VERCEL_PROJECT_NAME=ai-automated-pipeline

GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=your_app_password
EMAIL_RECIPIENT=recipient@example.com

GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

### Verify connections

```bash
node check-connections.js
```

This checks all five services (Jira, GitHub, Vercel, Gmail, Groq) and reports their status before you start the pipeline.

### Run

```bash
node index.js
```

The pipeline runs immediately on startup, then every 5 minutes via cron. To trigger it, create a Jira story in your project, label it `ai-ready`, attach a `requirements.md` file, and leave it in **"To Do"** status.

## Jira story format

The `requirements.md` attachment should follow this structure:

```markdown
# Story Title

## Description
What the app should do.

## Acceptance Criteria
- User can do X
- User can do Y
- Data persists across sessions
```

The pipeline extracts the acceptance criteria and uses them to drive both the build prompt and the QA test plan.

## Failure handling

If any stage fails, the pipeline:

- Transitions the Jira story to the appropriate status (`To Do` for build/test/deploy failures, `IN QA` for QA/email failures)
- Adds a comment to the Jira story with the error details
- Sends a failure email report

## License

MIT
