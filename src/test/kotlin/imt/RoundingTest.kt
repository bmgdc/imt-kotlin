package imt

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * No direct counterpart exists in the oracle's test files (roundCurrency is untested
 * there), so these expectations were produced by running the oracle's
 * `roundCurrency` / `Math.round` in Node v22 and pinning the observed outputs.
 */
class RoundingTest {

    @Test
    fun `roundCurrency matches oracle outputs`() {
        assertEquals(303.77, roundCurrency(303.768))
        assertEquals(1.01, roundCurrency(1.005)) // the epsilon nudge: plain rounding gives 1.00
        assertEquals(2.68, roundCurrency(2.675))
        assertEquals(0.13, roundCurrency(0.125))
        assertEquals(100.5, roundCurrency(100.495))
        assertEquals(0.0, roundCurrency(0.004999))
        assertEquals(0.0, roundCurrency(0.0008))
        assertEquals(2592.46, roundCurrency(2592.46408))
        assertEquals(1600.0, roundCurrency(1600.0))
    }

    @Test
    fun `roundCurrency on negatives rounds ties toward positive infinity`() {
        assertEquals(-1.0, roundCurrency(-1.005))
        // JS yields -0 here; the JVM yields 0.0. JSON writes both as 0 (see Rounding.kt).
        assertEquals(0.0, roundCurrency(-0.005))
    }

    @Test
    fun `jsMathRound rounds ties toward positive infinity`() {
        assertEquals(1.0, jsMathRound(0.5))
        assertEquals(2.0, jsMathRound(1.5))
        assertEquals(3.0, jsMathRound(2.5)) // kotlin.math.round would give 2.0
        assertEquals(-1.0, jsMathRound(-1.5))
        // Islands scaling inputs from constants.js:
        assertEquals(127396.0, jsMathRound(101917 * 1.25))
        assertEquals(405073.0, jsMathRound(324058 * 1.25))
    }
}
