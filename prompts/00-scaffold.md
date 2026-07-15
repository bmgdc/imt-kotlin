Save this prompt verbatim to prompts/00-scaffold.md and commit it before doing anything
else.

Read CLAUDE.md, then scaffold this repository:

- Kotlin + Gradle (Kotlin DSL), JDK 21, a Ktor server with a GET /health endpoint
  returning {"status": "ok"}, kotlinx.serialization, kotlin.test on JUnit 5 with one
  passing smoke test.
- GitHub Actions workflow running ./gradlew test on push.
- The directory skeleton from CLAUDE.md's Architecture section (empty packages are fine).

Verify ./gradlew test and ./gradlew run actually work before calling it done. Commit in
small steps, then append the first DEVLOG.md entry describing this session.
