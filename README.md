# lett.

A calm, self-paced way to learn trading fundamentals. Built with Next.js, React, TypeScript, and CSS.

## Features

- 61 beginner lessons across seven learning phases, with checkpoints and references.
- Progress tracking, notes, search, and reading preferences.
- Local data storage with JSON backup and restore.
- Optional AI assistant powered by a local Ollama model.

## Getting started

Requires Node.js 20.9+ and npm.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Optional AI assistant

Run [Ollama](https://ollama.com/) and install a chat model, such as `ollama pull llama3.2`. The app connects to `http://127.0.0.1:11434` by default. To use a different server or preferred model, copy `.env.example` to `.env.local` and set `OLLAMA_BASE_URL` or `OLLAMA_MODEL`.

Ollama must be reachable from the Next.js server. The assistant routes are intended for local use; add authentication before deploying them publicly.

## Development

```bash
npm run typecheck
npm run build
npm test
```

Browser tests use Playwright and a locally installed Google Chrome. Set `PLAYWRIGHT_CHANNEL=chromium` to use Playwright Chromium instead.

## Data and disclaimer

Progress and notes stay in your browser's local storage; there is no account or cloud sync. Export a backup from Settings before clearing browser data or moving devices.

Content and AI responses are for education only. They are not financial advice or live trade signals.
