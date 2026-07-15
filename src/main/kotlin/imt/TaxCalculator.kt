package imt

/**
 * Result of [computeTax] for one buyer's slice of the price.
 *
 * @property amount The IMT amount payable for the specific share.
 * @property marginalRate The marginal tax rate applied, determined by the total value.
 * @property deduction The proportional "parcela a abater" for the buyer's share.
 */
data class TaxResult(
    val amount: Double,
    val marginalRate: Double,
    val deduction: Double,
)

/**
 * Computes tax by dynamically calculating the accumulated tax of lower brackets.
 * This avoids rounding errors found in "average rate" tables and ensures accuracy
 * for properties with multiple owners by deriving values from the global price.
 *
 * Legal context:
 * - Implements CIMT Art. 17.º, n.º 3.
 * - Mathematical formula: Tax = (Tax on Lower Brackets) + (Excess × Marginal Rate).
 *
 * The arithmetic mirrors the oracle's `computeTax` operation for operation — do not
 * refactor the expressions (see CLAUDE.md on float parity).
 *
 * @param valueToTax The portion of the property value belonging to the specific buyer.
 * @param totalValue The total acquisition price (determines the tax bracket).
 * @param table The enriched bracket table (hpp, secondary, or jovem).
 */
fun computeTax(valueToTax: Double, totalValue: Double, table: List<Bracket>): TaxResult {
    if (totalValue <= 0) {
        return TaxResult(
            amount = 0.0,
            marginalRate = table.firstOrNull()?.rate ?: 0.0,
            deduction = 0.0,
        )
    }

    val bracketIndex = table.indexOfFirst { totalValue <= it.upTo }
    val currentBracket = table[bracketIndex]

    if (currentBracket.isFlat) {
        return TaxResult(
            amount = valueToTax * currentBracket.rate,
            marginalRate = currentBracket.rate,
            deduction = 0.0,
        )
    }

    var accumulatedTax = 0.0
    var previousLimit = 0.0

    for (i in 0 until bracketIndex) {
        val bracket = table[i]
        val taxableInThisBracket = bracket.upTo - previousLimit
        accumulatedTax += taxableInThisBracket * bracket.rate
        previousLimit = bracket.upTo
    }

    val excess = totalValue - previousLimit
    val taxOnExcess = excess * currentBracket.rate

    val totalGlobalTax = accumulatedTax + taxOnExcess
    val globalDeduction = totalValue * currentBracket.rate - totalGlobalTax

    val shareRatio = valueToTax / totalValue

    return TaxResult(
        amount = totalGlobalTax * shareRatio,
        marginalRate = currentBracket.rate,
        deduction = roundCurrency(globalDeduction * shareRatio),
    )
}
