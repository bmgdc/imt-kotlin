plugins {
    // Auto-provisions the JDK required by the toolchain spec in build.gradle.kts,
    // so the build only needs a JVM capable of running Gradle itself.
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.10.0"
}

rootProject.name = "imt-kotlin"
