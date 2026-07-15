package api

import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ApiRoutesTest {

    private val json = Json

    // --- POST /api/imt ------------------------------------------------------

    /**
     * Cross-check against a golden.json entry: the API must return exactly what
     * the oracle recorded for the same input, with the youngun->jovem naming
     * mapped at this boundary. The chosen case exercises the richest output
     * shape: two buyers (0.7 non-resident / 0.3 standard) in 2026, where the
     * non-resident flat rate and refund estimate are live.
     */
    @Test
    fun `POST api-imt matches the golden case it mirrors`() = testApplication {
        application { module() }

        val goldenPath = System.getProperty("goldenJsonPath") ?: "oracle/golden.json"
        val golden = json.parseToJsonElement(File(goldenPath).readText()).jsonObject
        val case = golden.getValue("cases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("id").jsonPrimitive.content == "2026/mainland/hpp/pair-nonresident-standard/none/264443" }
        val input = case.getValue("input").jsonObject
        val expected = case.getValue("output").jsonObject

        // Rebuild the request with the port's naming (isYoungunEligible -> isJovemEligible).
        val requestBody = buildJsonObject {
            put("price", input.getValue("price"))
            put("purpose", input.getValue("purpose"))
            put("isInUrbanRehabArea", input.getValue("isInUrbanRehabArea"))
            put("postRehabFirstTransfer", input.getValue("postRehabFirstTransfer"))
            put("year", input.getValue("year"))
            put("location", input.getValue("location"))
            put(
                "buyers",
                kotlinx.serialization.json.buildJsonArray {
                    input.getValue("buyers").jsonArray.forEach { buyer ->
                        val b = buyer.jsonObject
                        add(
                            buildJsonObject {
                                put("isJovemEligible", b.getValue("isYoungunEligible"))
                                put("isOffshoreEntity", b.getValue("isOffshoreEntity"))
                                put("isNonResident", b.getValue("isNonResident"))
                                put("share", b.getValue("share"))
                            },
                        )
                    }
                },
            )
        }

        val response = client.post("/api/imt") {
            contentType(ContentType.Application.Json)
            setBody(requestBody.toString())
        }
        assertEquals(HttpStatusCode.OK, response.status)
        val actual = json.parseToJsonElement(response.bodyAsText()).jsonObject

        val expectedTotal = expected.getValue("total").jsonObject
        val actualTotal = actual.getValue("total").jsonObject
        for (field in listOf("imt", "stampDuty", "total", "deduction", "nonResidentPotentialRefund")) {
            assertEquals(
                expectedTotal.getValue(field).jsonPrimitive.double,
                actualTotal.getValue(field).jsonPrimitive.double,
                "total.$field",
            )
        }

        val expectedBreakdown = expected.getValue("breakdown").jsonArray
        val actualBreakdown = actual.getValue("breakdown").jsonArray
        assertEquals(expectedBreakdown.size, actualBreakdown.size, "breakdown size")

        // youngun (golden) -> jovem (API) status-flag mapping.
        val statusFieldMap = mapOf(
            "isOffshore" to "isOffshore",
            "isNonResident" to "isNonResident",
            "isEligibleForRehabilitationExemption" to "isEligibleForRehabilitationExemption",
            "isEligibleForPostRehabFirstSaleExemption" to "isEligibleForPostRehabFirstSaleExemption",
            "isYoungunImt" to "isJovemImt",
            "isYoungunStampDuty" to "isJovemStampDuty",
        )

        expectedBreakdown.zip(actualBreakdown).forEachIndexed { i, (expRow, actRow) ->
            val exp = expRow.jsonObject
            val act = actRow.jsonObject
            for (field in listOf("share", "value", "imt", "stampDuty", "total")) {
                assertEquals(
                    exp.getValue(field).jsonPrimitive.double,
                    act.getValue(field).jsonPrimitive.double,
                    "breakdown[$i].$field",
                )
            }
            val expStatus = exp.getValue("status").jsonObject
            val actStatus = act.getValue("status").jsonObject
            statusFieldMap.forEach { (goldenField, apiField) ->
                assertEquals(
                    expStatus.getValue(goldenField).jsonPrimitive.boolean,
                    actStatus.getValue(apiField).jsonPrimitive.boolean,
                    "breakdown[$i].status.$apiField",
                )
            }
            val expMeta = exp.getValue("meta").jsonObject
            val actMeta = act.getValue("meta").jsonObject
            for (field in listOf("rate", "deduction", "nonResidentPotentialRefund")) {
                assertEquals(
                    expMeta.getValue(field).jsonPrimitive.double,
                    actMeta.getValue(field).jsonPrimitive.double,
                    "breakdown[$i].meta.$field",
                )
            }
        }
    }

    @Test
    fun `POST api-imt handles a multi-buyer non-resident split with known values`() = testApplication {
        application { module() }

        val response = client.post("/api/imt") {
            contentType(ContentType.Application.Json)
            setBody(
                """
                {
                  "price": 400000,
                  "purpose": "hpp",
                  "buyers": [
                    {"isNonResident": true, "share": 0.5},
                    {"share": 0.5}
                  ],
                  "year": 2026,
                  "location": "mainland"
                }
                """.trimIndent(),
            )
        }
        assertEquals(HttpStatusCode.OK, response.status)

        val body = json.decodeFromString<ImtResponse>(response.bodyAsText())
        assertEquals(24_118.33, body.total.imt)
        assertEquals(3_200.0, body.total.stampDuty)
        assertEquals(27_318.33, body.total.total)
        assertEquals(2, body.breakdown.size)
        assertEquals(15_000.0, body.breakdown[0].imt)
        assertTrue(body.breakdown[0].status.isNonResident)
        assertEquals(0.075, body.breakdown[0].meta.rate)
        assertEquals(9_118.33, body.breakdown[1].imt)
        assertEquals(0.08, body.breakdown[1].meta.rate)
        assertEquals(5_881.67, body.total.nonResidentPotentialRefund, 0.005)
    }

    @Test
    fun `POST api-imt rejects an unknown year with 400 and a clear message`() = testApplication {
        application { module() }

        val response = client.post("/api/imt") {
            contentType(ContentType.Application.Json)
            setBody("""{"price": 100000, "purpose": "hpp", "buyers": [{"share": 1}], "year": 2030, "location": "mainland"}""")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
        val error = json.decodeFromString<ErrorResponse>(response.bodyAsText()).error
        assertContains(error, "Unknown year: 2030")
        assertContains(error, "2024, 2025, 2026")
    }

    @Test
    fun `POST api-imt rejects an unknown purpose with 400 and a clear message`() = testApplication {
        application { module() }

        val response = client.post("/api/imt") {
            contentType(ContentType.Application.Json)
            setBody("""{"price": 100000, "purpose": "castle", "buyers": [{"share": 1}], "year": 2025, "location": "mainland"}""")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
        val error = json.decodeFromString<ErrorResponse>(response.bodyAsText()).error
        assertContains(error, "Unknown purpose: 'castle'")
        assertContains(error, "hpp, secondary, rustic, other")
    }

    @Test
    fun `POST api-imt rejects an unknown location with 400 and a clear message`() = testApplication {
        application { module() }

        val response = client.post("/api/imt") {
            contentType(ContentType.Application.Json)
            setBody("""{"price": 100000, "purpose": "hpp", "buyers": [{"share": 1}], "year": 2025, "location": "mars"}""")
        }
        assertEquals(HttpStatusCode.BadRequest, response.status)
        assertContains(json.decodeFromString<ErrorResponse>(response.bodyAsText()).error, "Unknown location: 'mars'")
    }

    @Test
    fun `POST api-imt rejects structurally invalid input with 400`() = testApplication {
        application { module() }

        // Missing required field (price).
        val missingField = client.post("/api/imt") {
            contentType(ContentType.Application.Json)
            setBody("""{"purpose": "hpp", "buyers": [], "year": 2025, "location": "mainland"}""")
        }
        assertEquals(HttpStatusCode.BadRequest, missingField.status)
        assertContains(
            json.decodeFromString<ErrorResponse>(missingField.bodyAsText()).error,
            "Structurally invalid request",
        )

        // Malformed JSON.
        val malformed = client.post("/api/imt") {
            contentType(ContentType.Application.Json)
            setBody("""{"price": """)
        }
        assertEquals(HttpStatusCode.BadRequest, malformed.status)
        assertContains(
            json.decodeFromString<ErrorResponse>(malformed.bodyAsText()).error,
            "Structurally invalid request",
        )
    }

    // --- GET /api/tables/{year}/{location} ----------------------------------

    @Test
    fun `GET api-tables returns enriched tables with null for unbounded upTo`() = testApplication {
        application { module() }

        val response = client.get("/api/tables/2026/mainland")
        assertEquals(HttpStatusCode.OK, response.status)
        val body = json.decodeFromString<TablesResponse>(response.bodyAsText())

        assertEquals(setOf("hpp", "secondary", "jovem", "rustic", "other"), body.tables.keys)
        assertEquals(0.075, body.nonResidentRate)

        val hpp = body.tables.getValue("hpp")
        assertEquals(7, hpp.size)
        assertNull(hpp.last().upTo, "unbounded bracket must serialize upTo as null")
        assertTrue(hpp.last().isFlat)

        // Enrichment reaches the wire: exact values from the domain tables.
        val domainHpp = imt.imtData.getValue(2026).getValue(imt.Location.MAINLAND).tables.getValue("hpp")
        assertEquals(domainHpp[1].deduction, hpp[1].deduction)
        assertEquals(2126.92, hpp[1].deduction)
    }

    @Test
    fun `GET api-tables serves islands-scaled brackets and null rate for 2024`() = testApplication {
        application { module() }

        val response = client.get("/api/tables/2024/islands")
        assertEquals(HttpStatusCode.OK, response.status)
        val body = json.decodeFromString<TablesResponse>(response.bodyAsText())

        assertNull(body.nonResidentRate, "2024 predates the non-resident rule")
        assertEquals(127396.0, body.tables.getValue("hpp")[0].upTo, "101917 x 1.25, JS-rounded")
        // rustic is not islands-scaled and stays a single unbounded flat bracket.
        val rustic = body.tables.getValue("rustic")
        assertEquals(1, rustic.size)
        assertNull(rustic[0].upTo)
    }

    @Test
    fun `GET api-tables rejects bad paths`() = testApplication {
        application { module() }

        assertEquals(HttpStatusCode.NotFound, client.get("/api/tables/1999/mainland").status)
        assertEquals(HttpStatusCode.BadRequest, client.get("/api/tables/abc/mainland").status)
        assertEquals(HttpStatusCode.NotFound, client.get("/api/tables/2025/atlantis").status)
    }
}
