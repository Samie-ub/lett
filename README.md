# lett. — Learn the market. Find your footing.

A personal trading-learning website built with Next.js App Router, TypeScript, React, and plain CSS. The design takes inspiration from the supplied reference: a quiet sidebar, warm colors, illustrated phase cards, and an uncluttered reading experience. No CSS framework or animation library is used.

## Run

Requires Node.js 20.9+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To use another port: `npm run dev -- --port 3100` (stop another development server for this same project first).

```sh
npm run typecheck
npm run build
npm start
```

## Included

- 61 original beginner lessons across all 7 phases in the supplied roadmap.
- Clear explanations, hypothetical examples, key takeaways, reflection prompts, and lesson-specific references.
- Seven phase checkpoints with saved answers.
- Completion tracking, resume learning, activity history, weekly learning activity, and a learning streak.
- Text selection to capture a passage, an accessible “Save takeaway” alternative, and freeform notes.
- Note editing, deletion with temporary undo, search, and Markdown export.
- JSON export/restore for progress, notes, history, checkpoint answers, and reading size. Restore merges notes, activity, and completed lessons with existing data. Existing local versions win when IDs overlap.
- Light, dark, and system themes; three reading sizes; reduced-motion support; skip link; keyboard controls; mobile navigation with focus containment; semantic forms and live status announcements.
- Locally served DM Sans and Manrope fonts. Their SIL Open Font Licenses are in `public/fonts/`.

## Data and content

This version is a personal, local-first application. Data is saved in browser localStorage under `lett-learning-v1`, with the theme under `lett-theme`. It survives reloads on the same browser and origin. Clearing browser data, switching browsers, or changing the host/port does not carry progress over. There is no account, cloud sync, or analytics. The optional AI assistant uses server routes to connect to Ollama. Export a backup in Settings to move or preserve your data.

## Local AI assistant

Open Ollama (or run `ollama serve`), start this app, and click **Ask AI** on any page. Select an installed local chat model; use **Refresh models** after installing one. For example, `ollama pull llama3.2` installs a small chat model if you need one. Cloud models and embedding-only models are excluded from the picker.

The assistant can explain the current lesson, give examples, answer follow-up questions, and link to lessons. It receives the lesson catalog, current and relevant lesson text, completion status, and up to ten preceding conversation messages. Notes and reading history are not sent. Replies are displayed when generation finishes; **Stop response** cancels a request. Errors preserve your question for retry. Chats stay in memory for the current page visit and reset on reload; only the selected model is saved in `lett-ai-model`.

By default, the Next.js server connects to `http://127.0.0.1:11434`. To change this, copy `.env.example` to `.env.local`, set `OLLAMA_BASE_URL` and optionally `OLLAMA_MODEL`, and restart Next.js. Ollama must be reachable from the **server**, not just the browser. A hosted deployment cannot reach your laptop through its own localhost. These unauthenticated routes are intended for personal local use; add authentication before exposing the app publicly.

The integration uses Ollama's [chat API](https://docs.ollama.com/api/chat) and [model list API](https://docs.ollama.com/api/tags). No paid API key or additional SDK is needed. AI answers are educational and may be inaccurate.

The lesson copy was authored by ChatGPT for this project; no OpenAI API key is required. Content lives in `lib/curriculum.ts` and can be edited there. The source registry links to Investor.gov, FINRA, CME Group, Fidelity, and TradingView. References were checked during development in September 2026. External sources can change; review periodically before publishing or expanding the curriculum.

Examples and practice prompts are original educational scenarios, not live market data, trade signals, personalized advice, or guarantees. The curriculum distinguishes securities and futures margin, explains costs and leverage, and does not treat “90% lose,” stop hunts, institutional accumulation, or chart patterns as universally established facts. Completion represents self-reported reading, not professional qualification.

## Verification

With the development server running, use:

```sh
npm test
```

The Playwright configuration uses a locally installed Google Chrome (`channel: 'chrome'`). For environments without Chrome, install Playwright Chromium with `npx playwright install chromium`, then set `PLAYWRIGHT_CHANNEL=chromium npm test`. `PLAYWRIGHT_BASE_URL` can point the tests at a different local port or a production build.

The suite covers selection-to-note capture, persistence, editing and deletion undo, completion, history filters, curriculum coverage, lesson search, checkpoints, theme and reading preferences, backup merge and validation, mobile navigation, overflow, and axe accessibility checks in both themes. Automated accessibility tests complement—but do not replace—manual assistive-technology testing.

## Structure

- `app/`: Next.js pages, layout, and plain CSS.
- `components/learning-app.tsx`: learning interface and browser persistence.
- `components/icons.tsx`: inline SVG icons and original illustrations.
- `lib/curriculum.ts`: lessons, phases, quizzes, and references.
- `lib/storage.ts`: data types, validation, streak calculation, and file exports.
- `tests/learning.spec.ts`: browser and accessibility checks.

All lesson URLs are prerendered at build time. The dashboard and other sections use `/?view=path`, `notes`, `history`, `progress`, `resources`, and `settings`.
# lett
# lett
# lett
# lett
