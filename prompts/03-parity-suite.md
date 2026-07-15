Save this prompt verbatim to prompts/03-parity-suite.md and commit it before doing
anything else. Read CLAUDE.md and the latest DEVLOG.md entry.

Write src/test/kotlin/ParityTest.kt as a JUnit 5 @TestFactory generating one DynamicTest
per golden case (named after the case's self-describing id), not one aggregate test —
so Gradle's own report and console output show a per-case pass/fail breakdown for free.
Load oracle/golden.json, decode nulls back to Double.POSITIVE_INFINITY where applicable,
run every case through ImtEngine, and assert exact equality on every rounded output field
(totals and per-buyer breakdown, including status flags and meta). Also add a testLogging
block to build.gradle.kts (events "passed", "failed"; exceptionFormat "full") so
./gradlew test prints per-test results and a summary line to the console, not just to the
XML/HTML reports. Run the suite once, record the initial pass/fail count in DEVLOG.md,
and commit. Do not start fixing failures yet.
