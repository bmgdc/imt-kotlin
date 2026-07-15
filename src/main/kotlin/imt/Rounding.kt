package imt

import kotlin.math.roundToLong

/**
 * JS `Number.EPSILON` (2^-52), mirrored so [roundCurrency] reproduces the oracle's
 * epsilon-adjustment rounding bit for bit.
 */
private const val JS_EPSILON = 2.220446049250313E-16

/**
 * Rounds a currency value to two decimal places using the oracle's epsilon-adjustment
 * method (`Math.round((num + Number.EPSILON) * 100) / 100`), which nudges values like
 * `1.005` off the truncated side of the half before rounding.
 *
 * JS `Math.round` rounds ties toward +∞. On the JVM that is `Math.round` /
 * [roundToLong] — **not** `kotlin.math.round`, which rounds ties to even.
 *
 * Known benign divergence: for tiny negatives (e.g. `-0.005`) JS produces `-0`,
 * the JVM `0.0`. JSON serializes both as `0`, so golden-data parity is unaffected.
 */
fun roundCurrency(num: Double): Double = ((num + JS_EPSILON) * 100).roundToLong() / 100.0

/**
 * Mirrors a bare JS `Math.round` (ties toward +∞) returning a whole-valued Double.
 * Used where the oracle rounds to whole euros: islands bracket scaling and the
 * islands jovem stamp-duty threshold (both ×1.25 in `tax_utils.js`).
 */
fun jsMathRound(num: Double): Double = num.roundToLong().toDouble()
