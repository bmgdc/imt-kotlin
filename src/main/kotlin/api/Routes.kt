package api

import imt.Location
import imt.Purpose
import imt.calculateImt
import imt.imtData
import io.ktor.http.HttpStatusCode
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post

private fun parseLocation(value: String): Location? = when (value) {
    "mainland" -> Location.MAINLAND
    "islands" -> Location.ISLANDS
    else -> null
}

private fun parsePurpose(value: String): Purpose? = Purpose.entries.find { it.key == value }

private val availableYears = imtData.keys.sorted()

fun Route.imtApi() {
    post("/api/imt") {
        val request = try {
            call.receive<ImtRequest>()
        } catch (e: Exception) {
            val detail = generateSequence<Throwable>(e) { it.cause }.last().message ?: "malformed request body"
            return@post call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse("Structurally invalid request: $detail"),
            )
        }

        val purpose = parsePurpose(request.purpose)
            ?: return@post call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse(
                    "Unknown purpose: '${request.purpose}'. Expected one of: " +
                        Purpose.entries.joinToString(", ") { it.key } + ".",
                ),
            )
        val location = parseLocation(request.location)
            ?: return@post call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse("Unknown location: '${request.location}'. Expected 'mainland' or 'islands'."),
            )
        if (request.year !in imtData) {
            return@post call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse("Unknown year: ${request.year}. Available years: ${availableYears.joinToString(", ")}."),
            )
        }

        val result = calculateImt(
            price = request.price,
            purpose = purpose,
            isInUrbanRehabArea = request.isInUrbanRehabArea,
            postRehabFirstTransfer = request.postRehabFirstTransfer,
            buyers = request.buyers.map { it.toDomain() },
            year = request.year,
            location = location,
        )

        call.respond(result.toDto())
    }

    get("/api/tables/{year}/{location}") {
        val yearParam = call.parameters["year"].orEmpty()
        val year = yearParam.toIntOrNull()
            ?: return@get call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse("Invalid year: '$yearParam'. Expected an integer."),
            )
        val location = parseLocation(call.parameters["location"].orEmpty())
            ?: return@get call.respond(
                HttpStatusCode.NotFound,
                ErrorResponse("Unknown location: '${call.parameters["location"]}'. Expected 'mainland' or 'islands'."),
            )
        val regionData = imtData[year]?.get(location)
            ?: return@get call.respond(
                HttpStatusCode.NotFound,
                ErrorResponse("No data for year $year. Available years: ${availableYears.joinToString(", ")}."),
            )

        call.respond(
            TablesResponse(
                tables = regionData.tables.mapValues { (_, table) -> table.map { it.toDto() } },
                nonResidentRate = regionData.nonResidentRate,
            ),
        )
    }
}
