package api

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class StaticFrontendTest {

    @Test
    fun `serves index html at the root`() = testApplication {
        application { module() }

        val response = client.get("/")
        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(response.contentType()?.match(ContentType.Text.Html) == true)
        assertContains(response.bodyAsText(), "IMT Calculator")
    }

    @Test
    fun `serves the app script`() = testApplication {
        application { module() }

        val response = client.get("/app.js")
        assertEquals(HttpStatusCode.OK, response.status)
        assertContains(response.bodyAsText(), "POST /api/imt", ignoreCase = false)
    }
}
