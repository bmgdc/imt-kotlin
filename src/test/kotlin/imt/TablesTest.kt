package imt

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotSame
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Ported from oracle/tax_utils.test.js. */
class TablesTest {

    private val mockTable = listOf(
        Bracket(upTo = 100.0, rate = 0.0),
        Bracket(upTo = 200.0, rate = 0.1),
        Bracket(upTo = 300.0, rate = 0.2),
        Bracket(upTo = Double.POSITIVE_INFINITY, rate = 0.05, isFlat = true),
    )

    @Test
    fun `enrichTable returns a new table and keeps all properties`() {
        val enriched = enrichTable(mockTable)

        assertNotSame(mockTable, enriched)
        assertTrue(enriched[3].isFlat)
        assertEquals(0.05, enriched[3].rate)
    }

    @Test
    fun `enrichTable computes the correct deduction values`() {
        val enriched = enrichTable(mockTable)

        assertEquals(0.0, enriched[0].deduction)
        assertEquals(10.0, enriched[1].deduction)
        assertEquals(30.0, enriched[2].deduction)
        assertEquals(0.0, enriched[3].deduction)
    }

    @Test
    fun `carries the 2026 non-resident rate into both regions without island scaling`() {
        assertEquals(0.075, imtData.getValue(2026).getValue(Location.MAINLAND).nonResidentRate)
        assertEquals(0.075, imtData.getValue(2026).getValue(Location.ISLANDS).nonResidentRate)
    }

    @Test
    fun `leaves years before the rule entered into force without a non-resident rate`() {
        assertNull(imtData.getValue(2024).getValue(Location.MAINLAND).nonResidentRate)
        assertNull(imtData.getValue(2025).getValue(Location.MAINLAND).nonResidentRate)
    }

    @Test
    fun `keeps the non-resident rate on the latest year's data while the rule is in force`() {
        // Guard: the rule applies through data presence, so forgetting to carry
        // `nonResidentRate` into a new year's RAW_IMT_DATA entry would silently
        // drop it. Fails loudly instead — remove only if the law is repealed.
        val latestYear = imtData.keys.max()
        assertEquals(0.075, imtData.getValue(latestYear).getValue(Location.MAINLAND).nonResidentRate)
    }
}
