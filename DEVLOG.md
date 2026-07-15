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
