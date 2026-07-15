# syntax=docker/dockerfile:1

# --- Build stage: compile and assemble a runnable distribution ---------------
# The gradle image ships a full JDK 21, so the Kotlin toolchain (jvmToolchain(21))
# resolves to it directly — no toolchain download needed at build time.
FROM gradle:8.14.2-jdk21 AS build
WORKDIR /src

# Optional JVM args for the Gradle process (e.g. a proxy for the dependency
# download). Empty by default so this file stays credential-free and builds
# unchanged on a normal network and in CI; supply -Dhttp.proxyHost=... at build
# time only where a proxy is required.
ARG GRADLE_OPTS=""
ENV GRADLE_OPTS=${GRADLE_OPTS}

COPY . .
# installDist assembles build/install/imt-kotlin (launch script + jars). Tests
# run in CI, not here, so the build stays fast and needs no golden data.
RUN gradle --no-daemon clean installDist

# --- Runtime stage: slim JRE serving the app ---------------------------------
FROM eclipse-temurin:21-jre AS runtime

# Run as an unprivileged user.
RUN groupadd --system app && useradd --system --gid app --no-create-home app
WORKDIR /app

COPY --from=build /src/build/install/imt-kotlin/ ./

# The server reads PORT (default 8080); EXPOSE documents that default. The
# static frontend (index.html, app.js) is packaged inside the jar, so no
# separate copy is needed.
ENV PORT=8080
EXPOSE 8080

USER app
ENTRYPOINT ["./bin/imt-kotlin"]
