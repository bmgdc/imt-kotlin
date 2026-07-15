package imt

import kotlin.test.Test
import kotlin.test.assertEquals

/** Ported from oracle/tax_calculator.test.js. */
class TaxCalculatorTest {

    private val mockTable = listOf(
        Bracket(upTo = 100.0, rate = 0.0),
        Bracket(upTo = 200.0, rate = 0.1),
        Bracket(upTo = 300.0, rate = 0.2),
        Bracket(upTo = Double.POSITIVE_INFINITY, rate = 0.05, isFlat = true),
    )

    @Test
    fun `returns 0 when the total value is 0 (avoiding NaN)`() {
        val result = computeTax(0.0, 0.0, mockTable)
        assertEquals(0.0, result.amount)
        assertEquals(mockTable[0].rate, result.marginalRate)
        assertEquals(0.0, result.deduction)
    }

    @Test
    fun `returns 0 for values in the first bracket (0 percent)`() {
        val result = computeTax(50.0, 50.0, mockTable)
        assertEquals(0.0, result.amount)
        assertEquals(0.0, result.marginalRate)
    }

    @Test
    fun `calculates progressive tax correctly across two brackets`() {
        val result = computeTax(150.0, 150.0, mockTable)
        assertEquals(5.0, result.amount)
        assertEquals(0.1, result.marginalRate)
    }

    @Test
    fun `calculates progressive tax correctly across three brackets`() {
        val result = computeTax(250.0, 250.0, mockTable)
        assertEquals(20.0, result.amount)
        assertEquals(0.2, result.marginalRate)
    }

    @Test
    fun `jumps to flat rate logic when the threshold is hit`() {
        val result = computeTax(400.0, 400.0, mockTable)
        assertEquals(20.0, result.amount)
        assertEquals(0.05, result.marginalRate)
    }

    @Test
    fun `applies proportionality correctly for partial shares`() {
        val result = computeTax(125.0, 250.0, mockTable)
        assertEquals(10.0, result.amount)
    }
}
