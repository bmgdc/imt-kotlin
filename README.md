# IMT Kotlin

A Kotlin/Ktor web service that calculates Portuguese **IMT** (property transfer tax) and
**stamp duty**, with a static single-page frontend. It is a faithful port of an existing
JavaScript calculator, built end to end with Claude Code as a **documented** exercise in
agent-driven development — the prompts and the development log are part of the deliverable,
not an afterthought.

**Live demo:** https://imt-kotlin.fly.dev/

---

## What this is (and how it was built)

The domain logic is a port of **my own prior JavaScript implementation** from another
project (a realtor's personal website). That reference engine is vendored read-only under
[`oracle/`](oracle/); the original React frontend it shipped with is vendored, also
read-only, under [`frontend-reference/`](frontend-reference/). Nothing in either directory
was rewritten — they are the source of truth the port is measured against.

Everything else — the Kotlin domain, the HTTP API, the static frontend, and the tests —
was written by **Claude Code, driven and reviewed by me (Bruno)**, one session at a time.
Each session began from a prompt committed verbatim before any work started; the running
narrative (decisions, dead ends, surprises) is in [`DEVLOG.md`](DEVLOG.md).

Being explicit, per this repository's honesty rules: the correctness of the tax math is not an
original claim — it is inherited from the reference implementation and **proven equal to
it** by the parity suite described below. The value added here is the port, the
server-side architecture, and the test harness that guarantees the port did not drift.

## Provenance at a glance

| Directory | What it is | Status |
| --- | --- | --- |
| [`oracle/`](oracle/) | The reference JS engine (my prior work) + its original tests | Vendored, read-only |
| [`frontend-reference/`](frontend-reference/) | The original React frontend + its English strings | Vendored, read-only |
| [`src/main/kotlin/imt/`](src/main/kotlin/imt/) | The ported domain (pure Kotlin, no framework) | This port |
| [`src/main/kotlin/api/`](src/main/kotlin/api/) | Ktor routes + DTOs | This port |
| [`src/main/resources/static/`](src/main/resources/static/) | The static frontend (vanilla JS) | This port |
| [`prompts/`](prompts/) | Every session's kickoff prompt, verbatim | Process record |

The tax rules themselves are legally sourced (CIMT Art. 17.º and related); the reference
code cites the articles and those citations are carried into the Kotlin KDoc. The law is
not reinterpreted here — parity with the reference is the only correctness standard.

## Correctness: golden-master parity

The port is verified by a **golden-master** approach rather than by hand-written
assertions alone:

1. [`oracle/generate-golden.mjs`](oracle/generate-golden.mjs) runs the reference JS engine
   over a systematic matrix — every fiscal year in the data × mainland/islands × all four
   property purposes × ten buyer configurations (singles, combined-flag singles that pin
   the legal precedence order, and 0.7/0.3 pairs) × the exemption flags × price points
   derived from each bracket table (every boundary, boundary + 0.01, a mid-bracket point,
   a point inside each flat tier, plus 0 and 1). After de-duplication this is
   **11,640 cases**, captured with full input and full output in
   [`oracle/golden.json`](oracle/golden.json).
2. [`src/test/kotlin/ParityTest.kt`](src/test/kotlin/ParityTest.kt) replays every case
   through the Kotlin engine as an individual JUnit 5 dynamic test (named after the case,
   so any failure identifies itself) and asserts **exact equality** on every output field —
   totals, per-buyer breakdown, status flags, and metadata.

All 11,640 cases pass. `golden.json` is generated, never hand-edited: if a parity test
ever fails, the Kotlin is wrong. The engine's own ported unit tests plus the API route
tests (one of which cross-checks a live HTTP response against a golden case) round out the
suite.

### Why `Double`, not `BigDecimal`

The reference engine computes in JavaScript `number` (IEEE 754 double) and rounds currency
with a specific `Math.round((x + Number.EPSILON) * 100) / 100` method, with ties going
toward +∞. **Bit-for-bit parity with that behaviour is the goal**, so the port uses
`Double` end to end and mirrors the JavaScript operation order line for line, including the
rounding tie-break (`Double.roundToLong()`, i.e. JVM `Math.round`, **not**
`kotlin.math.round`, which rounds ties to even).

`BigDecimal` would be the right tool for a *new* financial calculator, but here it would be
actively wrong: it would produce different rounding at the boundaries and silently diverge
from the reference the port exists to reproduce. Matching the source's float semantics
exactly is what lets the 11,640-case suite assert strict equality instead of
"close enough". The one benign platform difference (JS `-0` vs JVM `0.0` for tiny
negatives) is documented where it lives and is invisible across the JSON boundary.

## Architecture

- **Domain** ([`imt/`](src/main/kotlin/imt/)) — framework-free Kotlin: bracket tables per
  year with the "parcela a abater" enrichment and islands ×1.25 scaling
  ([`Tables.kt`](src/main/kotlin/imt/Tables.kt)), the accumulated-tax progressive
  computation ([`TaxCalculator.kt`](src/main/kotlin/imt/TaxCalculator.kt)), the engine with
  its per-buyer precedence chain — offshore 10% › non-resident flat rate › urban-rehab
  exemption › post-rehab first transfer › jovem › standard —
  ([`ImtEngine.kt`](src/main/kotlin/imt/ImtEngine.kt)), and the currency rounding
  ([`Rounding.kt`](src/main/kotlin/imt/Rounding.kt)).
- **API** ([`api/`](src/main/kotlin/api/)) — Ktor:
  - `POST /api/imt` — takes the calculation input, returns totals plus the per-buyer
    breakdown; `400` with a clear message for an unknown year/location/purpose or a
    structurally invalid body.
  - `GET /api/tables/{year}/{location}` — the enriched bracket tables (unbounded bounds as
    `null`) plus the year's non-resident rate, for the frontend's reference tables.
  - `GET /health` — `{"status":"ok"}`.
- **Frontend** ([`static/`](src/main/resources/static/)) — a reduced, single-file emulation
  of the original React tool (vanilla JS, Tailwind via CDN, no build step). The structural
  twist versus the original: **calculation happens server-side.** Input changes are
  debounced and POSTed to the API; the reference tables are fetched per location change.

## Running it

### Prerequisites

JDK 21. The Gradle wrapper is included; on a machine without a JDK the build auto-provisions
one via the foojay toolchain resolver.

### Gradle

```bash
./gradlew test    # unit + route + 11,640-case parity suite
./gradlew run     # serves on http://localhost:8080 (blocks; Ctrl+C to stop)
```

Then open <http://localhost:8080>.

### Docker

Multi-stage build (Gradle build stage → slim JRE runtime). The server reads `PORT`
(default `8080`).

```bash
docker build -t imt-kotlin .
docker run --rm -p 8080:8080 imt-kotlin
# or choose a port:
docker run --rm -e PORT=9000 -p 9000:9000 imt-kotlin
```

Then open <http://localhost:8080>.

### Regenerating the golden data

Rarely needed — only when the reference engine's data changes:

```bash
node oracle/generate-golden.mjs
```

## Continuous integration

[GitHub Actions](.github/workflows/ci.yml) runs `./gradlew test` — the full suite,
including all 11,640 parity cases — on every push. A red build is fixed before any feature
work lands on top of it.

## The process is the point

This repository is meant to be read as much as run. The intended trail:

1. [`prompts/`](prompts/) — what each session was asked to do, verbatim and unedited.
2. [`DEVLOG.md`](DEVLOG.md) — what actually happened in each: the decisions, the surprises,
   and the dead ends (kept in, not tidied away).
3. The commit history — small, imperative commits, one logical step at a time.

No benchmarks or process metrics are invented anywhere in this repository; the DEVLOG records the
work as it happened, including where it went sideways.
