import { roundCurrency } from "./tax_utils.js";

/**
 * Computes tax by dynamically calculating the "Accumulated Tax" of lower brackets.
 * This avoids rounding errors found in "Average Rate" tables and ensures accuracy
 * for properties with multiple owners by deriving values from the Global Price.
 * * Legal Context:
 * - Implements CIMT Art. 17, No. 3
 * - Mathematical Formula: Tax = (Tax on Lower Brackets) + (Excess * Marginal Rate)
 *
 * @param {number} valueToTax - The portion of the property value belonging to the specific buyer.
 * @param {number} totalValue - The total acquisition price of the property (used to determine the tax bracket).
 * @param {Array<Object>} table - The enriched tax bracket table (HPP, Secondary, or Jovem).
 * @returns {Object} A result object containing:
 * @returns {number} amount - The IMT amount payable for the specific share.
 * @returns {number} marginalRate - The marginal tax rate applied based on totalValue.
 * @returns {number} deduction - The proportional "Parcela a abater" for the buyer"s share.
 */
export const computeTax = (valueToTax, totalValue, table) => {
  if (totalValue <= 0) {
    return {
      amount: 0,
      marginalRate: table[0]?.rate || 0,
      deduction: 0,
    };
  }

  const bracketIndex = table.findIndex((b) => totalValue <= b.upTo);
  const currentBracket = table[bracketIndex];

  if (currentBracket.type === "flat") {
    return {
      amount: valueToTax * currentBracket.rate,
      marginalRate: currentBracket.rate,
      deduction: 0,
    };
  }

  let accumulatedTax = 0;
  let previousLimit = 0;

  for (let i = 0; i < bracketIndex; i++) {
    const bracket = table[i];
    const taxableInThisBracket = bracket.upTo - previousLimit;
    accumulatedTax += taxableInThisBracket * bracket.rate;
    previousLimit = bracket.upTo;
  }

  const excess = totalValue - previousLimit;
  const taxOnExcess = excess * currentBracket.rate;

  const totalGlobalTax = accumulatedTax + taxOnExcess;
  const globalDeduction = totalValue * currentBracket.rate - totalGlobalTax;

  const shareRatio = valueToTax / totalValue;

  return {
    amount: totalGlobalTax * shareRatio,
    marginalRate: currentBracket.rate,
    deduction: roundCurrency(globalDeduction * shareRatio),
  };
};
