Save this prompt verbatim to prompts/04-api-frontend.md and commit it before doing
anything else. Read CLAUDE.md, the latest DEVLOG.md entry, and
frontend-reference/NOTES.md.

Expose the engine over HTTP:

- POST /api/imt: accepts the calculateImt input shape (jovem naming, camelCase), returns
  totals plus the per-buyer breakdown with status flags and meta; 400 with a clear
  message for unknown year/location/purpose or structurally invalid input.
- GET /api/tables/{year}/{location}: the enriched bracket tables (null for the unbounded
  upTo) plus the year's nonResidentRate when present — what the reference tables and
  their display rules need.

Add route tests using Ktor's test host, including at least one case cross-checked
against a golden.json entry.

Then the frontend: emulate the original tool per frontend-reference/NOTES.md — same
layout, interaction rules, and copy (strings-en.jsx verbatim), reduced to a single static
index.html plus app.js under src/main/resources/static/: vanilla JS, Tailwind Play CDN,
no build step, nothing beyond what NOTES.md keeps. Calculation is server-side now:
debounce input changes and POST /api/imt; fetch the tables per year/location change.

Verify end to end by running the server and exercising at least three scenarios in a
real browser, including one multi-buyer and one non-resident case. Commit, update
DEVLOG.md.
