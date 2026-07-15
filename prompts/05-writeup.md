Save this prompt verbatim to prompts/05-writeup.md and commit it before doing anything
else. Read CLAUDE.md and the whole DEVLOG.md.

Add a production Dockerfile (multi-stage: Gradle build stage, slim JRE runtime stage; the
server reads PORT with default 8080) and a .dockerignore. Verify the image builds and
serves the app locally before moving on.

Then write the README for a hiring-team reader, per CLAUDE.md's honesty rules: what this
is, the provenance of the domain logic and the reference frontend, the golden-master
parity approach and why Double (not BigDecimal) was the right call here, how the process
was documented (link prompts/, DEVLOG.md, the CI runs), how to run it (Gradle and
Docker), and the final parity case count. Leave a placeholder for the live URL. Commit,
final DEVLOG.md entry.
