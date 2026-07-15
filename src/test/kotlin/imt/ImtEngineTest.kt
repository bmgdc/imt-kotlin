package imt

import java.time.Year
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Ported from oracle/imt.test.js. `toBe` becomes exact Double equality;
 * `toBeCloseTo(x, 2)` becomes assertEquals with tolerance 0.005.
 */
class ImtEngineTest {

    // --- General behavior -------------------------------------------------

    @Test
    fun `works against current year constants`() {
        // The oracle's test carries the same time bomb: it uses the wall-clock
        // year, so it (and this port) will fail when RAW_IMT_DATA lacks the
        // current year's tables.
        val currentYear = Year.now().value
        val threshold =
            imtData.getValue(currentYear).getValue(Location.ISLANDS).jovemStampDutyExemptionThreshold

        val result = calculateImt(
            location = Location.ISLANDS,
            price = threshold + 1,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isJovemEligible = true, share = 1.0)),
            year = currentYear,
        )

        assertTrue(result.total.imt > 0)
    }

    // --- IMT 2025 calculator logic ----------------------------------------

    private val islandsThreshold2025 =
        imtData.getValue(2025).getValue(Location.ISLANDS).jovemStampDutyExemptionThreshold

    @Test
    fun `calculates zero tax for a jovem HPP buyer at the threshold`() {
        val result = calculateImt(
            location = Location.ISLANDS,
            price = islandsThreshold2025,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isJovemEligible = true, share = 1.0)),
            year = 2025,
        )
        assertEquals(0.0, result.total.imt)
        assertEquals(0.0, result.total.stampDuty)
        assertEquals(0.0, result.total.total)
    }

    @Test
    fun `calculates zero tax for a jovem HPP buyer below threshold`() {
        val result = calculateImt(
            location = Location.ISLANDS,
            price = islandsThreshold2025 - 0.01,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isJovemEligible = true, share = 1.0)),
            year = 2025,
        )
        assertEquals(0.0, result.total.imt)
        assertEquals(0.0, result.total.stampDuty)
        assertEquals(0.0, result.total.total)
    }

    @Test
    fun `calculates 9 cents tax for a jovem HPP buyer 1 euro above threshold`() {
        val result = calculateImt(
            location = Location.ISLANDS,
            price = islandsThreshold2025 + 1,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isJovemEligible = true, share = 1.0)),
            year = 2025,
        )
        assertEquals(0.08, result.total.imt)
        assertEquals(0.01, result.total.stampDuty)
        assertEquals(0.09, result.total.total)
    }

    @Test
    fun `splits taxes for a couple where both buyers are jovem-eligible`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 400_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(
                Buyer(isJovemEligible = true, share = 0.5),
                Buyer(isJovemEligible = true, share = 0.5),
            ),
            year = 2025,
        )
        val buyer1 = result.breakdown[0]
        val buyer2 = result.breakdown[1]
        assertTrue(buyer1.status.isJovemImt)
        assertEquals(3037.68, buyer1.imt)
        assertEquals(303.77, buyer1.stampDuty)
        assertEquals(0.08, buyer1.meta.rate)
        assertEquals(12962.32, buyer1.meta.deduction)
        assertTrue(buyer2.status.isJovemImt)
        assertEquals(3037.68, buyer2.imt)
        assertEquals(303.77, buyer2.stampDuty)
        assertEquals(0.08, buyer2.meta.rate)
        assertEquals(12962.32, buyer2.meta.deduction)
        assertEquals(6075.36, result.total.imt)
        assertEquals(result.total.imt, buyer1.imt + buyer2.imt)
        assertEquals(result.total.stampDuty, buyer1.stampDuty + buyer2.stampDuty)
        assertEquals(6682.9, result.total.total)
        assertEquals(25924.64, result.total.deduction, 0.005)
        assertEquals(result.total.deduction, buyer1.meta.deduction + buyer2.meta.deduction, 0.005)
    }

    @Test
    fun `splits taxes for a couple with equal shares where only one buyer is jovem-eligible`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 400_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(
                Buyer(isJovemEligible = true, share = 0.5),
                Buyer(isJovemEligible = false, share = 0.5),
            ),
            year = 2025,
        )
        val buyer1 = result.breakdown[0]
        val buyer2 = result.breakdown[1]
        assertTrue(buyer1.status.isJovemImt)
        assertEquals(3037.68, buyer1.imt)
        assertEquals(303.77, buyer1.stampDuty)
        assertEquals(0.08, buyer1.meta.rate)
        assertEquals(12962.32, buyer1.meta.deduction)
        assertFalse(buyer2.status.isJovemImt)
        assertEquals(9253.25, buyer2.imt)
        assertEquals(1600.0, buyer2.stampDuty)
        assertEquals(0.08, buyer2.meta.rate)
        assertEquals(6746.75, buyer2.meta.deduction)
        assertEquals(12290.93, result.total.imt)
        assertEquals(result.total.imt, buyer1.imt + buyer2.imt, 0.005)
        assertEquals(result.total.stampDuty, buyer1.stampDuty + buyer2.stampDuty, 0.005)
        assertEquals(14194.7, result.total.total)
        assertEquals(19709.07, result.total.deduction, 0.005)
        assertEquals(result.total.deduction, buyer1.meta.deduction + buyer2.meta.deduction, 0.005)
    }

    @Test
    fun `splits taxes for a couple with unequal shares where only one buyer is jovem-eligible`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 450_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(
                Buyer(isJovemEligible = true, share = 0.75),
                Buyer(isJovemEligible = false, share = 0.25),
            ),
            year = 2025,
        )
        val buyer1 = result.breakdown[0]
        val buyer2 = result.breakdown[1]
        assertTrue(buyer1.status.isJovemImt)
        assertEquals(7556.52, buyer1.imt)
        assertEquals(755.65, buyer1.stampDuty)
        assertEquals(0.08, buyer1.meta.rate)
        assertEquals(19443.48, buyer1.meta.deduction)
        assertFalse(buyer2.status.isJovemImt)
        assertEquals(5626.63, buyer2.imt)
        assertEquals(900.0, buyer2.stampDuty)
        assertEquals(0.08, buyer2.meta.rate)
        assertEquals(3373.38, buyer2.meta.deduction)
        assertEquals(13183.15, result.total.imt)
        assertEquals(result.total.imt, buyer1.imt + buyer2.imt, 0.005)
        assertEquals(result.total.stampDuty, buyer1.stampDuty + buyer2.stampDuty, 0.005)
        assertEquals(14838.8, result.total.total)
        assertEquals(22816.86, result.total.deduction, 0.005)
        assertEquals(result.total.deduction, buyer1.meta.deduction + buyer2.meta.deduction, 0.005)
    }

    @Test
    fun `applies secondary home rates`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 500_000.0,
            purpose = Purpose.SECONDARY,
            buyers = listOf(Buyer(share = 0.6), Buyer(share = 0.4)),
            year = 2025,
        )
        val buyer1 = result.breakdown[0]
        val buyer2 = result.breakdown[1]
        assertEquals(16529.47, buyer1.imt)
        assertEquals(2400.0, buyer1.stampDuty)
        assertEquals(11019.64, buyer2.imt)
        assertEquals(1600.0, buyer2.stampDuty)
        assertEquals(27549.11, result.total.imt)
        assertEquals(result.total.imt, buyer1.imt + buyer2.imt, 0.005)
        assertEquals(result.total.stampDuty, buyer1.stampDuty + buyer2.stampDuty, 0.005)
        assertEquals(31549.11, result.total.total)
        assertEquals(12450.89, result.total.deduction, 0.005)
        assertEquals(0.08, buyer1.meta.rate)
        assertEquals(7470.53, buyer1.meta.deduction)
        assertEquals(0.08, buyer2.meta.rate)
        assertEquals(4980.36, buyer2.meta.deduction)
        assertEquals(12450.89, buyer1.meta.deduction + buyer2.meta.deduction, 0.005)
    }

    @Test
    fun `applies identical IMT and full stamp duty for high-value jovem purchases in flat rate`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 850_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isJovemEligible = true, share = 1.0)),
            year = 2025,
        )
        assertEquals(51000.0, result.total.imt)
        assertEquals(6800.0, result.total.stampDuty)
        assertFalse(result.breakdown[0].status.isJovemStampDuty)
    }

    @Test
    fun `applies identical IMT but discounted stamp duty for medium-value jovem purchases`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 500_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isJovemEligible = true, share = 1.0)),
            year = 2025,
        )
        assertEquals(14075.36, result.total.imt)
        assertEquals(1407.54, result.total.stampDuty)
        assertTrue(result.breakdown[0].status.isJovemStampDuty)
    }

    @Test
    fun `calculates flat rates for rustic properties`() {
        val result = calculateImt(
            location = Location.ISLANDS,
            price = 230_000.0,
            purpose = Purpose.RUSTIC,
            buyers = listOf(Buyer(share = 1.0)),
            year = 2025,
        )
        assertEquals(11500.0, result.total.imt)
        assertEquals(1840.0, result.total.stampDuty)
        assertEquals(13340.0, result.total.total)
        assertEquals(0.0, result.breakdown[0].meta.deduction)
    }

    @Test
    fun `calculates flat 6point5 percent rate for other urban properties`() {
        val result = calculateImt(
            location = Location.ISLANDS,
            price = 200_000.0,
            purpose = Purpose.OTHER,
            buyers = listOf(Buyer(share = 1.0)),
            year = 2025,
        )
        assertEquals(13000.0, result.total.imt)
        assertEquals(1600.0, result.total.stampDuty)
        assertEquals(14600.0, result.total.total)
    }

    // --- Priority & regime collisions -------------------------------------

    @Test
    fun `prioritizes offshore penalty over rehab exemption`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 500_000.0,
            purpose = Purpose.HPP,
            isInUrbanRehabArea = true,
            buyers = listOf(Buyer(share = 1.0, isOffshoreEntity = true)),
            year = 2025,
        )
        val buyer = result.breakdown[0]
        assertEquals(50_000.0, buyer.imt)
        assertTrue(buyer.status.isOffshore)
        assertFalse(buyer.status.isEligibleForRehabilitationExemption)
    }

    @Test
    fun `combines rehab exemption with jovem stamp-duty discount`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 300_000.0,
            purpose = Purpose.HPP,
            isInUrbanRehabArea = true,
            buyers = listOf(Buyer(share = 1.0, isJovemEligible = true)),
            year = 2025,
        )
        val buyer = result.breakdown[0]
        assertEquals(0.0, buyer.imt)
        assertTrue(buyer.status.isEligibleForRehabilitationExemption)
        assertEquals(0.0, buyer.stampDuty)
        assertTrue(buyer.status.isJovemStampDuty)
    }

    @Test
    fun `applies rehab exemption but standard stamp duty if not jovem`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 200_000.0,
            purpose = Purpose.HPP,
            isInUrbanRehabArea = true,
            buyers = listOf(Buyer(share = 1.0, isJovemEligible = false)),
            year = 2025,
        )
        val buyer = result.breakdown[0]
        assertEquals(0.0, buyer.imt)
        assertEquals(1600.0, buyer.stampDuty)
        assertFalse(buyer.status.isJovemStampDuty)
    }

    @Test
    fun `applies rehab for IMT and jovem for stamp duty independently`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 300_000.0,
            purpose = Purpose.HPP,
            isInUrbanRehabArea = true,
            buyers = listOf(Buyer(isJovemEligible = true, share = 1.0)),
            year = 2025,
        )
        val buyer = result.breakdown[0]
        assertEquals(0.0, buyer.imt)
        assertTrue(buyer.status.isEligibleForRehabilitationExemption)
        assertFalse(buyer.status.isJovemImt)
        assertTrue(buyer.status.isJovemStampDuty)
    }

    @Test
    fun `applies first post-rehabilitation IMT exemption with jovem benefit`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 400_000.0,
            purpose = Purpose.HPP,
            postRehabFirstTransfer = true,
            buyers = listOf(Buyer(isJovemEligible = true, share = 1.0)),
            year = 2025,
        )
        val buyer = result.breakdown[0]
        assertEquals(0.0, buyer.imt)
        assertTrue(buyer.status.isEligibleForPostRehabFirstSaleExemption)
        assertEquals(607.54, buyer.stampDuty)
        assertTrue(buyer.status.isJovemStampDuty)
    }

    // --- Non-resident buyer (CIMT Art. 17.º n.º 10) ------------------------

    @Test
    fun `nonResidentRateApplies covers urban housing purposes for years carrying the rate`() {
        assertTrue(nonResidentRateApplies(imtData.getValue(2026).getValue(Location.MAINLAND), Purpose.HPP))
        assertTrue(nonResidentRateApplies(imtData.getValue(2026).getValue(Location.MAINLAND), Purpose.SECONDARY))
    }

    @Test
    fun `nonResidentRateApplies excludes rustic and other urban property`() {
        assertFalse(nonResidentRateApplies(imtData.getValue(2026).getValue(Location.MAINLAND), Purpose.RUSTIC))
        assertFalse(nonResidentRateApplies(imtData.getValue(2026).getValue(Location.MAINLAND), Purpose.OTHER))
    }

    @Test
    fun `nonResidentRateApplies excludes years before the rule entered into force`() {
        assertFalse(nonResidentRateApplies(imtData.getValue(2025).getValue(Location.MAINLAND), Purpose.HPP))
        assertFalse(nonResidentRateApplies(imtData.getValue(2024).getValue(Location.MAINLAND), Purpose.HPP))
    }

    @Test
    fun `applies a flat 7point5 percent with no deduction for a non-resident HPP buyer`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 500_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isNonResident = true, share = 1.0)),
            year = 2026,
        )
        val buyer = result.breakdown[0]
        assertEquals(37_500.0, buyer.imt)
        assertEquals(4_000.0, buyer.stampDuty)
        assertEquals(41_500.0, buyer.total)
        assertEquals(0.075, buyer.meta.rate)
        assertEquals(0.0, buyer.meta.deduction)
        assertTrue(buyer.status.isNonResident)
        assertEquals(37_500.0, result.total.imt)
        assertEquals(41_500.0, result.total.total)
        // Refund estimate (n.º 11): 7.5% paid minus the n.º 1 standard amount.
        assertEquals(11_263.35, buyer.meta.nonResidentPotentialRefund, 0.005)
        assertEquals(11_263.35, result.total.nonResidentPotentialRefund, 0.005)
    }

    @Test
    fun `applies the flat 7point5 percent to non-resident secondary-housing buyers too`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 400_000.0,
            purpose = Purpose.SECONDARY,
            buyers = listOf(Buyer(isNonResident = true, share = 1.0)),
            year = 2026,
        )
        val buyer = result.breakdown[0]
        assertEquals(30_000.0, buyer.imt)
        assertTrue(buyer.status.isNonResident)
        assertEquals(0.075, buyer.meta.rate)
        // Refund baseline follows the declared purpose's n.º 1 table (secondary here).
        assertEquals(10_699.89, result.total.nonResidentPotentialRefund, 0.005)
    }

    @Test
    fun `does not apply the flat rate to non-housing purposes`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 230_000.0,
            purpose = Purpose.RUSTIC,
            buyers = listOf(Buyer(isNonResident = true, share = 1.0)),
            year = 2026,
        )
        val buyer = result.breakdown[0]
        // Falls through to the normal 5% rustic rate; non-resident status is inert here.
        assertEquals(11_500.0, buyer.imt)
        assertEquals(0.05, buyer.meta.rate)
        assertFalse(buyer.status.isNonResident)
        assertEquals(0.0, result.total.nonResidentPotentialRefund)
    }

    @Test
    fun `applies the flat 7point5 percent regardless of location`() {
        val result = calculateImt(
            location = Location.ISLANDS,
            price = 500_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isNonResident = true, share = 1.0)),
            year = 2026,
        )
        assertEquals(37_500.0, result.breakdown[0].imt)
        assertEquals(0.075, result.breakdown[0].meta.rate)
        // The refund baseline uses the islands' own (×1.25-scaled) n.º 1 table.
        assertEquals(14_704.22, result.total.nonResidentPotentialRefund, 0.005)
    }

    @Test
    fun `prioritizes offshore penalty over the non-resident rate`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 500_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isOffshoreEntity = true, isNonResident = true, share = 1.0)),
            year = 2026,
        )
        val buyer = result.breakdown[0]
        assertEquals(50_000.0, buyer.imt)
        assertTrue(buyer.status.isOffshore)
        assertFalse(buyer.status.isNonResident)
        assertEquals(0.0, result.total.nonResidentPotentialRefund)
    }

    @Test
    fun `prioritizes the non-resident rate over the rehab exemption`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 500_000.0,
            purpose = Purpose.HPP,
            isInUrbanRehabArea = true,
            buyers = listOf(Buyer(isNonResident = true, share = 1.0)),
            year = 2026,
        )
        val buyer = result.breakdown[0]
        assertEquals(37_500.0, buyer.imt)
        assertTrue(buyer.status.isNonResident)
        assertFalse(buyer.status.isEligibleForRehabilitationExemption)
        // n.º 11 refunds down to the n.º 1 rates — not to the (excluded) exemption's zero.
        assertEquals(11_263.35, result.total.nonResidentPotentialRefund, 0.005)
    }

    @Test
    fun `prioritizes the non-resident rate over IMT jovem and suppresses its stamp-duty discount`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 300_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isNonResident = true, isJovemEligible = true, share = 1.0)),
            year = 2026,
        )
        val buyer = result.breakdown[0]
        assertEquals(22_500.0, buyer.imt)
        assertEquals(2_400.0, buyer.stampDuty)
        assertTrue(buyer.status.isNonResident)
        assertFalse(buyer.status.isJovemImt)
        assertFalse(buyer.status.isJovemStampDuty)
        // The refund baseline stays the standard table, not the jovem table.
        assertEquals(11_957.96, buyer.meta.nonResidentPotentialRefund, 0.005)
    }

    @Test
    fun `splits correctly between a non-resident and a standard resident buyer`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 400_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isNonResident = true, share = 0.5), Buyer(share = 0.5)),
            year = 2026,
        )
        val nonResident = result.breakdown[0]
        val resident = result.breakdown[1]

        assertEquals(15_000.0, nonResident.imt)
        assertEquals(1_600.0, nonResident.stampDuty)
        assertEquals(0.075, nonResident.meta.rate)
        assertEquals(0.0, nonResident.meta.deduction)
        assertTrue(nonResident.status.isNonResident)
        // Refund computed on the non-resident's share only.
        assertEquals(5_881.67, nonResident.meta.nonResidentPotentialRefund, 0.005)

        assertEquals(9_118.33, resident.imt)
        assertEquals(0.08, resident.meta.rate)
        assertEquals(6_881.68, resident.meta.deduction)
        assertFalse(resident.status.isNonResident)
        assertEquals(0.0, resident.meta.nonResidentPotentialRefund)

        assertEquals(24_118.33, result.total.imt)
        assertEquals(3_200.0, result.total.stampDuty)
        assertEquals(27_318.33, result.total.total)
        assertEquals(6_881.68, result.total.deduction)
        assertEquals(5_881.67, result.total.nonResidentPotentialRefund, 0.005)
    }

    @Test
    fun `estimates a zero refund when the standard regime already taxes at 7point5 percent`() {
        val result = calculateImt(
            location = Location.MAINLAND,
            price = 1_200_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isNonResident = true, share = 1.0)),
            year = 2026,
        )
        assertEquals(90_000.0, result.total.imt)
        assertTrue(result.breakdown[0].status.isNonResident)
        assertEquals(0.0, result.total.nonResidentPotentialRefund)
    }

    @Test
    fun `has no effect for fiscal years before the rule entered into force`() {
        val result2025 = calculateImt(
            location = Location.MAINLAND,
            price = 400_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isNonResident = true, share = 1.0)),
            year = 2025,
        )
        // Standard 2025 hpp result — the flag is inert before 2026.
        assertEquals(18_506.5, result2025.total.imt)
        assertFalse(result2025.breakdown[0].status.isNonResident)
        assertEquals(0.0, result2025.total.nonResidentPotentialRefund)

        val result2024 = calculateImt(
            location = Location.MAINLAND,
            price = 400_000.0,
            purpose = Purpose.HPP,
            buyers = listOf(Buyer(isNonResident = true, share = 1.0)),
            year = 2024,
        )
        assertEquals(18_809.86, result2024.total.imt)
        assertFalse(result2024.breakdown[0].status.isNonResident)
        assertEquals(0.0, result2024.total.nonResidentPotentialRefund)
    }
}
