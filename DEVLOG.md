# DEVLOG

## 2026-07-15 — Session 00: Scaffold

**Goal:** Scaffold the repo per `prompts/00-scaffold.md`: Kotlin + Gradle (Kotlin DSL)
on JDK 21, Ktor server with `GET /health`, kotlin.test on JUnit 5 with one passing
smoke test, GitHub Actions running `./gradlew test` on push, and the directory
skeleton from CLAUDE.md's Architecture section.

**What happened:**

- Committed the kickoff prompt verbatim, then scaffolded in small commits: Gradle
  build + wrapper, Ktor server + smoke test + skeleton, CI workflow.
- Versions: Gradle 8.14.2, Kotlin 2.1.21, Ktor 3.1.3, kotlinx.serialization via the
  Kotlin serialization plugin, logback 1.5.18.
- The machine had no Gradle installed, so the wrapper was bootstrapped by downloading
  the 8.14.2 distribution once and running `gradle wrapper`.
- Surprise: every JVM under `/usr/lib/jvm` here is a JRE — no `javac` anywhere — so
  Gradle's toolchain lookup for JDK 21 failed. Fixed by adding the foojay toolchain
  resolver to `settings.gradle.kts`, which auto-provisions a JDK on machines that
  lack one. (In this session's sandboxed environment the resolver itself couldn't
  authenticate through the local network proxy, so verification ran against a
  manually downloaded Temurin JDK 21; on a normal network the resolver handles it.)
- Verified as instructed: `./gradlew test` passes (1 test, 0 failures —
  `api.HealthTest.health endpoint returns ok`), and `./gradlew run` serves
  `GET /health` → `200 {"status":"ok"}` on :8080, checked with curl.

**Decisions:**

- `mainClass` is `api.ServerKt` (`src/main/kotlin/api/Server.kt`); the Ktor module is
  a separate `Application.module()` so tests exercise the same wiring via
  `testApplication`.
- The smoke test asserts the exact serialized body (`{"status":"ok"}`), not just the
  status code — cheap now, and it pins the serialization config early.
- Empty skeleton packages (`imt/`, `resources/static/`) are held by `.gitkeep`.
- CI uses `actions/setup-java` (Temurin 21) + `gradle/actions/setup-gradle`, plain
  `./gradlew test`.

**Next step:** Start the domain port — `Rounding.kt` first (the JS epsilon method and
`Math.round` tie-breaking rule from CLAUDE.md), then `Tables.kt`, with ported unit
tests. Generating `oracle/golden.json` and wiring `ParityTest.kt` comes once the
engine exists.

## 2026-07-15 — Session 01: Golden master

**Goal:** Per `prompts/01-golden-master.md`: write `oracle/generate-golden.mjs` (Node,
no dependencies) running the reference `calculateImt` over a systematic case matrix,
and commit the resulting `oracle/golden.json`.

**What happened:**

- Read the four oracle modules. Key engine facts that shaped the generator: the engine
  always consults `tables.jovem` (any purpose, if the buyer is jovem-eligible), the
  jovem stamp-duty discount cuts off at the jovem table's last *progressive* boundary,
  `nonResidentRate` exists only in 2026 (so earlier years double as "flag inert"
  coverage), and islands tables come pre-scaled (×1.25, `Math.round`) via `imtData`.
- Generator: 3 years × {mainland, islands} × {hpp, secondary, rustic, other} ×
  10 buyer configs × {none, rehab, postRehab} × per-cell price points (progressive
  boundaries, boundary+0.01, mid-bracket points, one point inside each flat tier,
  0, 1). Price points come from the purpose table *plus* the jovem table, for the
  reasons above. Result: **11,640 cases** after deduplication, ~11 MB, one case per
  line (line-diffable, valid JSON).
- The prompt's buyer-config bullets ("two buyers 0.7/0.3 mixing flags;
  jovem+non-resident; offshore+non-resident") read two ways — combined flags on one
  buyer, or pairs. Both are covered: 6 single-buyer configs (4 plain + 2 combined-flag,
  pinning the offshore > non-resident precedence in the JS comments) and 4 pairs
  at 0.7/0.3.
- Verified: golden.json parses, all 244,440 numbers finite, ids unique, count matches;
  regeneration is byte-identical (no timestamps). Semantic spot-checks against the
  reference tests and the legal comments passed: jovem pays 0 at the 2025 threshold,
  non-resident flag inert in 2024, 2026 non-resident = flat 7.5% with positive
  potential refund, offshore 10% beats non-resident, non-resident overrides jovem,
  rehab exemption doesn't shield offshore, islands boundary ×1.25 respected.
- Dead end (minor): a validation grep flagged "Infinity" in golden.json — it was my
  own `_comment` string describing the null convention. Reworded the comment.

**Decisions:**

- Unbounded values → `null` in JSON (per prompt); convention documented at the top of
  the generator. With the current data no case actually produces Infinity — the
  replacer is a guarantee, not a workaround.
- Golden data keeps the JS `youngun` naming (`isYoungunEligible`, totals fields); the
  Kotlin side maps to `jovem` at the oracle boundary, per CLAUDE.md.
- Case ids are self-describing (`year/location/purpose/config/flags/price`) so future
  parity failures name themselves.

**Next step:** Port the domain: `Rounding.kt`, then `Tables.kt` (enrichment + islands
scaling), `TaxCalculator.kt`, `ImtEngine.kt`, with ported unit tests — then wire
`ParityTest.kt` against golden.json.

## 2026-07-15 — Session 02: Domain port

**Goal:** Per `prompts/02-domain-port.md`: port the domain to
`src/main/kotlin/imt/` in order (Rounding → Tables → TaxCalculator → ImtEngine),
porting each component's unit tests before moving on. No parity suite yet.

**What happened:**

- One commit per component, tests green at each step. Final count: 45 tests
  (3 rounding, 5 tables, 6 calculator, 30 engine, 1 health), 0 failures.
- `Rounding.kt`: `roundCurrency` mirrors the JS epsilon method on `roundToLong`
  (ties toward +∞), plus `jsMathRound` for the islands ×1.25 whole-euro rounding.
  The oracle has no tests for `roundCurrency`, so RoundingTest's expectations were
  pinned by running the oracle in Node first — no guessed float values.
- `Tables.kt`: raw 2024–2026 data transcribed verbatim; enrichment and islands
  scaling keep the JS operation order (scale first, then enrich). `youngun` →
  `jovem` renames applied (`jovemStampDutyExemptionThreshold`, `isJovemEligible`,
  `isJovemImt`, `isJovemStampDuty`); `nonResidentRate` is a nullable Double —
  null meaning "rule not in force", mirroring the JS property-absence idiom.
- `TaxCalculator.kt` and `ImtEngine.kt`: line-for-line ports; the engine keeps the
  JS branch order and the exact rounding call sites. CIMT Art. 17.º citations
  (n.º 3, n.º 4, n.º 10–12, DL 97/2026) carried into KDoc.
- All exact `toBe` expectations from the JS tests (e.g. 3037.68 / 12962.32 /
  18506.5) pass under strict Double equality in Kotlin — IEEE 754 arithmetic is
  identical on the JVM, an encouraging signal for the golden parity run.

**Decisions / notes:**

- Purposes are an enum (`Purpose.HPP`…, with `.key` for table lookup); the jovem
  table sits alongside purpose tables under the `JOVEM_TABLE` key, as in the JS.
- JS `roundCurrency(-0.005)` returns `-0`, the JVM `0.0`. JSON writes both as `0`,
  so parity is unaffected; documented in Rounding.kt and pinned in RoundingTest.
- The JS `else if (buyer.isYoungunEligible && globalYoungun)` guard drops its
  always-truthy second operand in Kotlin — same semantics, noted here for the
  record.
- The oracle's "current year" test reads the wall clock; the port keeps that
  (and its 2027 time bomb, when RAW_IMT_DATA will lack the year) faithfully —
  flagged in a test comment rather than fixed, per the no-deviation rule.

**Next step:** Wire `ParityTest.kt`: load `oracle/golden.json`, map the JS naming
(`youngun*`, string purposes/locations, null-for-Infinity) at the boundary, run all
11,640 cases through `calculateImt`, and compare exactly.

## 2026-07-15 — Session 03: Parity suite

**Goal:** Per `prompts/03-parity-suite.md`: wire `ParityTest.kt` as a JUnit 5
`@TestFactory` — one `DynamicTest` per golden case, named after the case's
self-describing id — decode golden.json at the boundary, run every case through
`ImtEngine`, and assert exact equality on every rounded output field. Add
`testLogging` to `build.gradle.kts` so results print to the console. Run once,
record the count, commit. No fixing failures this session.

**What happened:**

- `ParityTest.kt` (package-less, `src/test/kotlin/`, per CLAUDE.md's architecture
  listing) decodes golden.json via kotlinx.serialization (already on the test
  classpath transitively — no new dependency needed), maps `youngun*` → `jovem*`
  and string purpose/location back to the `Purpose`/`Location` enums, and asserts
  every field of `total` and every `breakdown[]` entry (including `status` and
  `meta`) with `assertEquals` per field so a failure names its exact mismatched
  field, not just "objects differ".
- Null-to-`Infinity` decoding is implemented as the docs require (`Double?.orInfinity()`
  at every numeric field), even though — confirmed by grep — no value in the current
  golden.json is ever actually null; the current price/rate/amount domain is always
  finite. It's boundary discipline per CLAUDE.md's convention, not dead code chasing
  a real case today.
- `build.gradle.kts`: added `testLogging { events("passed", "failed"); exceptionFormat
  = FULL }` and a `goldenJsonPath` system property pointing at
  `rootProject.file("oracle/golden.json")`, so the suite doesn't depend on the
  invoking shell's working directory.
- **Result: 11,640/11,640 golden cases passed on the first run.** Full suite:
  11,685 tests total (11,640 parity + 45 unit), 0 failures.
- Before trusting an all-green run at this scale, ran a negative control: temporarily
  added `+ 999.0` to one expected value and reran — all 11,640 cases failed as
  expected, confirming the harness actually exercises the assertions rather than
  passing vacuously. Reverted, reran clean, then committed.

**Decisions / notes:**

- No parity failures to fix — the domain port from Session 02 achieved full parity
  against the oracle on the first attempt. The CLAUDE.md protocol for the parity-loop
  ("track failing-case count, stop after two stuck attempts") is not engaged this
  session since there was nothing to iterate on.
- Per-field assertions (not a single deep-equals) were chosen deliberately: with
  11,640 cases, a failure needs to self-diagnose from the test name + assertion
  message alone without opening a debugger.

**Next step:** No domain work is pending parity-wise. Candidates for the next
session: wire the Ktor API routes (`POST /api/imt`, `GET /api/tables/{year}/{location}`)
against the now-verified engine, or start the static frontend per
`frontend-reference/NOTES.md`.
