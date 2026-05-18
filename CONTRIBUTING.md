# Contributing

Thank you for your interest in contributing to AI-Automated-Pipeline.

## Getting started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install && npm run install-browsers`
3. Copy `.env.example` to `.env` and fill in your credentials
4. Run `node check-connections.js` to verify all services are reachable

## How to contribute

### Reporting bugs

Open a GitHub issue with:
- A clear description of the problem
- The pipeline stage where it failed (build, tests, github, vercel, qa, email)
- The relevant log output
- Your Node.js version (`node --version`)

### Suggesting features

Open a GitHub issue describing the feature, why it would be useful, and how you envision it working. For large changes, discuss before opening a PR.

### Submitting a pull request

1. Create a branch from `main`: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test them by running the pipeline against a real Jira story
4. Push your branch and open a PR against `main`
5. Describe what changed and why in the PR description

## Code conventions

- **CommonJS only** — use `require`/`module.exports`, never `import`/`export`
- **No axios** — use the custom `utils/http.js` client (Node built-ins only)
- **No comments explaining what code does** — only add a comment when the *why* is non-obvious
- **No unnecessary error handling** — only validate at system boundaries (API responses, user input)
- One file per pipeline stage under `stages/`, shared helpers under `utils/`

## Pipeline stages

Each stage is a single exported async function:

```js
async function stageName(story, ...args) { ... }
module.exports = { stageName };
```

Stages should throw on unrecoverable errors — the orchestrator handles transitions and notifications.

## Environment variables

Never hardcode credentials. All secrets go in `.env` (git-ignored). If you add a new integration, document the required variables in the README and `.env.example`.

## Testing

There is no automated test suite for the pipeline itself — the pipeline *is* the test runner for the apps it generates. Test your changes manually by running the full pipeline end-to-end against a Jira story.
