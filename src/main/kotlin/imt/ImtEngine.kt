package imt

import kotlin.math.max

/**
 * Flat IMT rate for entities domiciled in a privileged tax regime ("paraíso fiscal").
 * Always due, with no exemptions or reductions. Legal basis: CIMT Art. 17.º, n.º 4.
 * This rate prevails over the non-resident rate below: n.º 10 applies "sem prejuízo do
 * disposto no n.º 4", i.e. it leaves n.º 4 untouched, so a tax-haven buyer who is also
 * non-resident still pays 10%. Hence the offshore branch must be evaluated first.
 */
const val OFFSHORE_RATE = 0.1

/**
 * Property purposes that count as "destinado exclusivamente a habitação" for the
 * non-resident flat rate. Rustic land and other (commercial/land) acquisitions are
 * out of scope, so non-resident status does not change their rate.
 */
private val NON_RESIDENT_HOUSING_PURPOSES = setOf(Purpose.HPP, Purpose.SECONDARY)

/**
 * Whether the flat IMT rate for non-resident buyers applies for a given region
 * dataset and purpose. The rate is a per-year datum (`nonResidentRate` in
 * [RAW_IMT_DATA]) present only for years in which the rule is in force, so the
 * flag is inert for earlier fiscal years. Due upfront with no exemption or
 * reduction; the differential may later be refunded if the buyer becomes a tax
 * resident within two years or leases the property under the legal conditions.
 * Legal basis: CIMT Art. 17.º, n.º 10 (added by Decreto-Lei n.º 97/2026, de 20 de maio).
 * Opens with "sem prejuízo do disposto no n.º 4" — see [OFFSHORE_RATE] for the ordering.
 */
fun nonResidentRateApplies(regionData: RegionData, purpose: Purpose): Boolean =
    regionData.nonResidentRate != null && purpose in NON_RESIDENT_HOUSING_PURPOSES

/**
 * One buyer on the deed. JS: `isYoungunEligible`; this port uses the legal term
 * jovem (CIMT Art. 17.º-A). [share] defaults to an equal split when null,
 * mirroring the oracle's `buyer.share ?? 1 / buyers.length`.
 */
data class Buyer(
    val isJovemEligible: Boolean = false,
    val isOffshoreEntity: Boolean = false,
    val isNonResident: Boolean = false,
    val share: Double? = null,
)

/** Which regimes were actually applied to a buyer (JS: `breakdown[].status`). */
data class BuyerStatus(
    val isOffshore: Boolean,
    val isNonResident: Boolean,
    val isEligibleForRehabilitationExemption: Boolean,
    val isEligibleForPostRehabFirstSaleExemption: Boolean,
    val isJovemImt: Boolean,
    val isJovemStampDuty: Boolean,
)

/** Applied marginal rate, deduction share, and refund estimate (JS: `breakdown[].meta`). */
data class BuyerMeta(
    val rate: Double,
    val deduction: Double,
    val nonResidentPotentialRefund: Double,
)

/** Detailed calculation for one buyer. All currency fields are rounded. */
data class BuyerBreakdown(
    val buyerIndex: Int,
    val share: Double,
    val value: Double,
    val imt: Double,
    val stampDuty: Double,
    val total: Double,
    val status: BuyerStatus,
    val meta: BuyerMeta,
)

/** Aggregated totals across all buyers. All currency fields are rounded. */
data class ImtTotals(
    val imt: Double,
    val stampDuty: Double,
    val total: Double,
    val deduction: Double,
    val nonResidentPotentialRefund: Double,
)

data class ImtResult(
    val total: ImtTotals,
    val breakdown: List<BuyerBreakdown>,
)

/**
 * Main IMT calculation engine for the Portuguese property tax system.
 *
 * Uses a "global potentials" strategy: it calculates the tax obligations for the
 * entire property price under different legal regimes (standard vs. jovem) and then
 * distributes those totals proportionally among buyers based on their ownership share.
 *
 * Per-buyer precedence chain (see the KDoc on [OFFSHORE_RATE] and
 * [nonResidentRateApplies] for the legal ordering):
 * offshore 10% > non-resident flat rate > urban-rehab exemption > post-rehab first
 * transfer (hpp only) > jovem > standard.
 *
 * The arithmetic mirrors the oracle's `calculateImt` operation for operation — do
 * not refactor the expressions (see CLAUDE.md on float parity).
 */
fun calculateImt(
    price: Double,
    purpose: Purpose,
    isInUrbanRehabArea: Boolean = false,
    postRehabFirstTransfer: Boolean = false,
    buyers: List<Buyer> = emptyList(),
    year: Int,
    location: Location,
): ImtResult {
    val regionData = imtData.getValue(year).getValue(location)

    val stampDutyRate = regionData.stampDutyRate
    val tables = regionData.tables
    val jovemStampDutyExemptionThreshold = regionData.jovemStampDutyExemptionThreshold
    val nonResidentRate = regionData.nonResidentRate

    val globalStandard = computeTax(price, price, tables.getValue(purpose.key))
    val globalJovem = computeTax(price, price, tables.getValue(JOVEM_TABLE))
    val isNonResidentRateApplicable = nonResidentRateApplies(regionData, purpose)

    val lastProgressiveUpTo = tables.getValue(JOVEM_TABLE)
        .filter { !it.isFlat }
        .maxOf { it.upTo }

    var totalImt = 0.0
    var totalStampDuty = 0.0
    var totalDeduction = 0.0
    var totalNonResidentPotentialRefund = 0.0
    val breakdown = mutableListOf<BuyerBreakdown>()

    buyers.forEachIndexed { index, buyer ->
        val share = buyer.share ?: (1.0 / buyers.size)
        val buyerValue = price * share

        var buyerImt = 0.0
        var buyerDeduction = 0.0
        var appliedRate = 0.0

        var isOffshoreApplied = false
        var isNonResidentApplied = false
        var nonResidentPotentialRefund = 0.0
        var isRehabApplied = false
        var postRehabFirstTransferApplied = false
        var isJovemRateApplied = false
        var isJovemStampDutyApplied = false

        val isNonResidentHousing = buyer.isNonResident && isNonResidentRateApplicable

        if (buyer.isOffshoreEntity) {
            // n.º 4 first: n.º 10 applies "sem prejuízo do disposto no n.º 4", so 10% wins.
            buyerImt = buyerValue * OFFSHORE_RATE
            appliedRate = OFFSHORE_RATE
            isOffshoreApplied = true
        } else if (isNonResidentHousing) {
            // CIMT Art. 17.º n.º 10: flat rate, "não se aplicando qualquer isenção ou redução"
            // — overrides the rehab/post-rehab/jovem exemptions and reductions below.
            // nonResidentRate is non-null whenever isNonResidentRateApplicable holds.
            buyerImt = buyerValue * nonResidentRate!!
            appliedRate = nonResidentRate
            isNonResidentApplied = true
            // CIMT Art. 17.º n.º 11/12 — the carve-outs of n.º 10 b)/c) never reduce
            // the tax due at the deed; they let the buyer reclaim, on request (filed
            // within 6 months of the trigger), the difference versus the n.º 1
            // standard rates. Estimated here; never subtracted from the amount due.
            nonResidentPotentialRefund = max(0.0, buyerImt - globalStandard.amount * share)
        } else if (isInUrbanRehabArea) {
            buyerImt = 0.0
            appliedRate = 0.0
            isRehabApplied = true
        } else if (postRehabFirstTransfer && purpose == Purpose.HPP) {
            buyerImt = 0.0
            appliedRate = 0.0
            postRehabFirstTransferApplied = true
        } else if (buyer.isJovemEligible) {
            buyerImt = globalJovem.amount * share
            buyerDeduction = globalJovem.deduction * share
            appliedRate = globalJovem.marginalRate
            isJovemRateApplied = true
        } else {
            buyerImt = globalStandard.amount * share
            buyerDeduction = globalStandard.deduction * share
            appliedRate = globalStandard.marginalRate
        }

        val fullStampDuty = buyerValue * stampDutyRate
        var finalStampDuty = fullStampDuty

        if (
            !buyer.isOffshoreEntity &&
            !isNonResidentApplied &&
            buyer.isJovemEligible &&
            price <= lastProgressiveUpTo
        ) {
            val maxDiscount = jovemStampDutyExemptionThreshold * share * stampDutyRate
            finalStampDuty = max(0.0, fullStampDuty - maxDiscount)
            if (finalStampDuty < fullStampDuty) {
                isJovemStampDutyApplied = true
            }
        }

        totalImt += buyerImt
        totalDeduction += buyerDeduction
        totalStampDuty += finalStampDuty
        totalNonResidentPotentialRefund += nonResidentPotentialRefund

        breakdown.add(
            BuyerBreakdown(
                buyerIndex = index,
                share = share,
                value = roundCurrency(buyerValue),
                imt = roundCurrency(buyerImt),
                stampDuty = roundCurrency(finalStampDuty),
                total = roundCurrency(buyerImt + finalStampDuty),
                status = BuyerStatus(
                    isOffshore = isOffshoreApplied,
                    isNonResident = isNonResidentApplied,
                    isEligibleForRehabilitationExemption = isRehabApplied,
                    isEligibleForPostRehabFirstSaleExemption = postRehabFirstTransferApplied,
                    isJovemImt = isJovemRateApplied,
                    isJovemStampDuty = isJovemStampDutyApplied,
                ),
                meta = BuyerMeta(
                    rate = appliedRate,
                    deduction = roundCurrency(buyerDeduction),
                    nonResidentPotentialRefund = roundCurrency(nonResidentPotentialRefund),
                ),
            ),
        )
    }

    return ImtResult(
        total = ImtTotals(
            imt = roundCurrency(totalImt),
            stampDuty = roundCurrency(totalStampDuty),
            total = roundCurrency(totalImt + totalStampDuty),
            deduction = roundCurrency(totalDeduction),
            nonResidentPotentialRefund = roundCurrency(totalNonResidentPotentialRefund),
        ),
        breakdown = breakdown,
    )
}
