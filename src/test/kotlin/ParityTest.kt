import imt.Buyer
import imt.Location
import imt.Purpose
import imt.calculateImt
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.TestFactory
import java.io.File
import kotlin.test.assertEquals

/**
 * Golden-master parity suite. One [DynamicTest] per case in `oracle/golden.json`
 * (per CLAUDE.md: "If a parity test fails, the Kotlin is wrong — fix the Kotlin";
 * golden.json itself is never hand-edited, only regenerated from the oracle).
 *
 * Case ids double as test names, so a failing case names itself in the report —
 * e.g. `2026/mainland/hpp/single-nonresident/none/264443`.
 */

@Serializable
private data class GoldenFile(val caseCount: Int, val cases: List<GoldenCase>)

@Serializable
private data class GoldenCase(val id: String, val input: GoldenInput, val output: GoldenOutput)

@Serializable
private data class GoldenInput(
    val price: Double? = null,
    val purpose: String,
    val isInUrbanRehabArea: Boolean,
    val postRehabFirstTransfer: Boolean,
    val buyers: List<GoldenBuyer>,
    val year: Int,
    val location: String,
)

@Serializable
private data class GoldenBuyer(
    val isYoungunEligible: Boolean = false,
    val isOffshoreEntity: Boolean = false,
    val isNonResident: Boolean = false,
    val share: Double? = null,
)

@Serializable
private data class GoldenOutput(val total: GoldenTotals, val breakdown: List<GoldenBreakdown>)

@Serializable
private data class GoldenTotals(
    val imt: Double? = null,
    val stampDuty: Double? = null,
    val total: Double? = null,
    val deduction: Double? = null,
    val nonResidentPotentialRefund: Double? = null,
)

@Serializable
private data class GoldenBreakdown(
    val buyerIndex: Int,
    val share: Double? = null,
    val value: Double? = null,
    val imt: Double? = null,
    val stampDuty: Double? = null,
    val total: Double? = null,
    val status: GoldenStatus,
    val meta: GoldenMeta,
)

@Serializable
private data class GoldenStatus(
    val isOffshore: Boolean,
    val isNonResident: Boolean,
    val isEligibleForRehabilitationExemption: Boolean,
    val isEligibleForPostRehabFirstSaleExemption: Boolean,
    val isYoungunImt: Boolean,
    val isYoungunStampDuty: Boolean,
)

@Serializable
private data class GoldenMeta(
    val rate: Double? = null,
    val deduction: Double? = null,
    val nonResidentPotentialRefund: Double? = null,
)

/** golden.json's documented convention: JSON null at the boundary means unbounded. */
private fun Double?.orInfinity(): Double = this ?: Double.POSITIVE_INFINITY

private val json = Json { ignoreUnknownKeys = true }

class ParityTest {

    @TestFactory
    fun `golden master cases`(): List<DynamicTest> {
        val path = System.getProperty("goldenJsonPath") ?: "oracle/golden.json"
        val golden = json.decodeFromString<GoldenFile>(File(path).readText())
        check(golden.cases.size == golden.caseCount) {
            "golden.json caseCount (${golden.caseCount}) does not match cases.size (${golden.cases.size})"
        }

        return golden.cases.map { case -> dynamicTest(case.id) { runCase(case) } }
    }

    private fun runCase(case: GoldenCase) {
        val input = case.input
        val purpose = Purpose.entries.first { it.key == input.purpose }
        val location = when (input.location) {
            "mainland" -> Location.MAINLAND
            "islands" -> Location.ISLANDS
            else -> error("unknown location: ${input.location}")
        }
        val buyers = input.buyers.map { b ->
            Buyer(
                isJovemEligible = b.isYoungunEligible,
                isOffshoreEntity = b.isOffshoreEntity,
                isNonResident = b.isNonResident,
                share = b.share,
            )
        }

        val actual = calculateImt(
            price = input.price.orInfinity(),
            purpose = purpose,
            isInUrbanRehabArea = input.isInUrbanRehabArea,
            postRehabFirstTransfer = input.postRehabFirstTransfer,
            buyers = buyers,
            year = input.year,
            location = location,
        )

        val expected = case.output

        assertEquals(expected.total.imt.orInfinity(), actual.total.imt, "${case.id}: total.imt")
        assertEquals(expected.total.stampDuty.orInfinity(), actual.total.stampDuty, "${case.id}: total.stampDuty")
        assertEquals(expected.total.total.orInfinity(), actual.total.total, "${case.id}: total.total")
        assertEquals(expected.total.deduction.orInfinity(), actual.total.deduction, "${case.id}: total.deduction")
        assertEquals(
            expected.total.nonResidentPotentialRefund.orInfinity(),
            actual.total.nonResidentPotentialRefund,
            "${case.id}: total.nonResidentPotentialRefund",
        )

        assertEquals(expected.breakdown.size, actual.breakdown.size, "${case.id}: breakdown.size")
        expected.breakdown.zip(actual.breakdown).forEach { (exp, act) ->
            val label = "${case.id}: breakdown[${exp.buyerIndex}]"
            assertEquals(exp.buyerIndex, act.buyerIndex, "$label.buyerIndex")
            assertEquals(exp.share.orInfinity(), act.share, "$label.share")
            assertEquals(exp.value.orInfinity(), act.value, "$label.value")
            assertEquals(exp.imt.orInfinity(), act.imt, "$label.imt")
            assertEquals(exp.stampDuty.orInfinity(), act.stampDuty, "$label.stampDuty")
            assertEquals(exp.total.orInfinity(), act.total, "$label.total")

            assertEquals(exp.status.isOffshore, act.status.isOffshore, "$label.status.isOffshore")
            assertEquals(exp.status.isNonResident, act.status.isNonResident, "$label.status.isNonResident")
            assertEquals(
                exp.status.isEligibleForRehabilitationExemption,
                act.status.isEligibleForRehabilitationExemption,
                "$label.status.isEligibleForRehabilitationExemption",
            )
            assertEquals(
                exp.status.isEligibleForPostRehabFirstSaleExemption,
                act.status.isEligibleForPostRehabFirstSaleExemption,
                "$label.status.isEligibleForPostRehabFirstSaleExemption",
            )
            assertEquals(exp.status.isYoungunImt, act.status.isJovemImt, "$label.status.isJovemImt")
            assertEquals(exp.status.isYoungunStampDuty, act.status.isJovemStampDuty, "$label.status.isJovemStampDuty")

            assertEquals(exp.meta.rate.orInfinity(), act.meta.rate, "$label.meta.rate")
            assertEquals(exp.meta.deduction.orInfinity(), act.meta.deduction, "$label.meta.deduction")
            assertEquals(
                exp.meta.nonResidentPotentialRefund.orInfinity(),
                act.meta.nonResidentPotentialRefund,
                "$label.meta.nonResidentPotentialRefund",
            )
        }
    }
}
