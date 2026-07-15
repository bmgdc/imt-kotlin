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
