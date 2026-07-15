package api

import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.pluginOrNull
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class CallLoggingTest {

    @Test
    fun `CallLogging is installed and requests still route`() = testApplication {
        var app: Application? = null
        application {
            module()
            app = this
        }

        // A real request routes through the configured module...
        val response = client.get("/health")
        assertEquals(HttpStatusCode.OK, response.status)

        // ...and the request-logging plugin is wired into that module.
        assertNotNull(app?.pluginOrNull(CallLogging), "CallLogging plugin should be installed")
    }
}
