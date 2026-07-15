Save this prompt verbatim to prompts/06-ci-and-logging.md and commit it before doing
anything else. Read CLAUDE.md and the latest DEVLOG.md entry.

Two independent operational fixes — keep them as two separate commits (they touch
unrelated things and should be reviewable on their own):

1. CI is failing before any test runs: the GitHub Actions run errored with
   "./gradlew: Permission denied" (exit 126). Root cause: gradlew is tracked with git
   mode 100644, not 100755, so it checks out non-executable on the Linux runner. This
   repo lives on a mount with core.filemode=false, so `chmod +x gradlew` alone will NOT
   update git's record — use `git update-index --chmod=+x gradlew` to set mode 100755 in
   the index, then confirm with `git ls-files --stage gradlew` (expect 100755). Commit
   this on its own.

2. Running the server prints nothing per request. Install Ktor's CallLogging plugin
   (add the io.ktor:ktor-server-call-logging:$ktorVersion dependency) in
   Application.module(), and add a minimal src/main/resources/logback.xml (console
   appender, root at INFO) so requests log to stdout as one line each — at least method,
   path, and status. Keep it quiet: suppress Netty/Ktor internal DEBUG noise so the log
   is readable. Add a test asserting the plugin is wired (e.g. a request routes and the
   CallLogging config is installed) — don't over-test framework internals. Commit this
   separately from fix 1.

Verify locally: ./gradlew test stays green (full suite, 11,696 tests), and ./gradlew run
now prints a log line when you curl an endpoint. Then verify CI actually goes green:
push, and watch the run with `gh run watch` (or poll `gh run list`) until it succeeds —
do not declare done on a red or pending run. Update DEVLOG.md with both fixes and the
confirmed-green CI run.
