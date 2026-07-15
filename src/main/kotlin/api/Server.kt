package api

import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.http.content.staticResources
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.request.httpMethod
import io.ktor.server.request.path
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import kotlinx.serialization.Serializable
import org.slf4j.event.Level

@Serializable
data class HealthResponse(val status: String)

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    embeddedServer(Netty, port = port, module = Application::module).start(wait = true)
}

fun Application.module() {
    install(CallLogging) {
        level = Level.INFO
        // One readable line per request: "<status> <METHOD> <path>", e.g. "200 GET /health".
        format { call ->
            val status = call.response.status()?.value ?: "-"
            "$status ${call.request.httpMethod.value} ${call.request.path()}"
        }
    }
    install(ContentNegotiation) {
        json()
    }
    routing {
        get("/health") {
            call.respond(HealthResponse(status = "ok"))
        }
        imtApi()
        staticResources("/", "static")
    }
}
