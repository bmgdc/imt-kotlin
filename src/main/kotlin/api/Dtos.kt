package api

import imt.Bracket
import imt.Buyer
import imt.BuyerBreakdown
import imt.ImtResult
import kotlinx.serialization.Serializable

/**
 * API DTOs. Naming follows the port's domain (jovem, camelCase). The
 * null-for-Infinity convention applies here — [BracketDto.upTo] is null for
 * unbounded brackets; the domain keeps [Double.POSITIVE_INFINITY] internally.
 */

@Serializable
data class BuyerDto(
    val isJovemEligible: Boolean = false,
    val isOffshoreEntity: Boolean = false,
    val isNonResident: Boolean = false,
    val share: Double? = null,
) {
    fun toDomain() = Buyer(
        isJovemEligible = isJovemEligible,
        isOffshoreEntity = isOffshoreEntity,
        isNonResident = isNonResident,
        share = share,
    )
}

@Serializable
data class ImtRequest(
    val price: Double,
    val purpose: String,
    val isInUrbanRehabArea: Boolean = false,
    val postRehabFirstTransfer: Boolean = false,
    val buyers: List<BuyerDto> = emptyList(),
    val year: Int,
    val location: String,
)

@Serializable
data class BuyerStatusDto(
    val isOffshore: Boolean,
    val isNonResident: Boolean,
    val isEligibleForRehabilitationExemption: Boolean,
    val isEligibleForPostRehabFirstSaleExemption: Boolean,
    val isJovemImt: Boolean,
    val isJovemStampDuty: Boolean,
)

@Serializable
data class BuyerMetaDto(
    val rate: Double,
    val deduction: Double,
    val nonResidentPotentialRefund: Double,
)

@Serializable
data class BuyerBreakdownDto(
    val buyerIndex: Int,
    val share: Double,
    val value: Double,
    val imt: Double,
    val stampDuty: Double,
    val total: Double,
    val status: BuyerStatusDto,
    val meta: BuyerMetaDto,
)

@Serializable
data class ImtTotalsDto(
    val imt: Double,
    val stampDuty: Double,
    val total: Double,
    val deduction: Double,
    val nonResidentPotentialRefund: Double,
)

@Serializable
data class ImtResponse(
    val total: ImtTotalsDto,
    val breakdown: List<BuyerBreakdownDto>,
)

@Serializable
data class BracketDto(
    val upTo: Double?,
    val rate: Double,
    val isFlat: Boolean,
    val deduction: Double,
)

/**
 * Response of GET /api/tables/{year}/{location}: the enriched bracket tables plus
 * the year's non-resident rate (null when CIMT Art. 17.º n.º 10 is not in force) —
 * what the frontend's reference tables and their display rules need.
 */
@Serializable
data class TablesResponse(
    val tables: Map<String, List<BracketDto>>,
    val nonResidentRate: Double?,
)

@Serializable
data class ErrorResponse(val error: String)

fun ImtResult.toDto() = ImtResponse(
    total = ImtTotalsDto(
        imt = total.imt,
        stampDuty = total.stampDuty,
        total = total.total,
        deduction = total.deduction,
        nonResidentPotentialRefund = total.nonResidentPotentialRefund,
    ),
    breakdown = breakdown.map { it.toDto() },
)

private fun BuyerBreakdown.toDto() = BuyerBreakdownDto(
    buyerIndex = buyerIndex,
    share = share,
    value = value,
    imt = imt,
    stampDuty = stampDuty,
    total = total,
    status = BuyerStatusDto(
        isOffshore = status.isOffshore,
        isNonResident = status.isNonResident,
        isEligibleForRehabilitationExemption = status.isEligibleForRehabilitationExemption,
        isEligibleForPostRehabFirstSaleExemption = status.isEligibleForPostRehabFirstSaleExemption,
        isJovemImt = status.isJovemImt,
        isJovemStampDuty = status.isJovemStampDuty,
    ),
    meta = BuyerMetaDto(
        rate = meta.rate,
        deduction = meta.deduction,
        nonResidentPotentialRefund = meta.nonResidentPotentialRefund,
    ),
)

fun Bracket.toDto() = BracketDto(
    upTo = if (upTo == Double.POSITIVE_INFINITY) null else upTo,
    rate = rate,
    isFlat = isFlat,
    deduction = deduction,
)
