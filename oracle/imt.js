import { computeTax } from "./tax_calculator.js";
import { roundCurrency } from "./tax_utils.js";
import { imtData } from "./tax_utils.js";

/**
 * Flat IMT rate for entities domiciled in a privileged tax regime ("paraíso fiscal").
 * Always due, with no exemptions or reductions. Legal basis: CIMT Art. 17.º, n.º 4.
 * This rate prevails over the non-resident rate below: n.º 10 applies "sem prejuízo do
 * disposto no n.º 4", i.e. it leaves n.º 4 untouched, so a tax-haven buyer who is also
 * non-resident still pays 10%. Hence the offshore branch must be evaluated first.
 */
const OFFSHORE_RATE = 0.1;

/**
 * Property purposes that count as "destinado exclusivamente a habitação" for the
 * non-resident flat rate. Rustic land and other (commercial/land) acquisitions are
 * out of scope, so non-resident status does not change their rate.
 */
const NON_RESIDENT_HOUSING_PURPOSES = ["hpp", "secondary"];

/**
 * Whether the flat IMT rate for non-resident buyers applies for a given region
 * dataset and purpose. The rate is a per-year datum (`nonResidentRate` in
 * `RAW_IMT_DATA`) present only for years in which the rule is in force, so the
 * flag is inert for earlier fiscal years. Due upfront with no exemption or
 * reduction; the differential may later be refunded if the buyer becomes a tax
 * resident within two years or leases the property under the legal conditions.
 * Legal basis: CIMT Art. 17.º, n.º 10 (added by Decreto-Lei n.º 97/2026, de 20 de maio).
 * Opens with "sem prejuízo do disposto no n.º 4" — see OFFSHORE_RATE for the ordering.
 *
 * @param {Object} regionData - The `imtData[year][location]` dataset.
 * @param {string} purpose - The property purpose (e.g., "hpp", "secondary", "rustic", "other").
 * @returns {boolean}
 */
export const nonResidentRateApplies = (regionData, purpose) =>
  regionData?.nonResidentRate != null && NON_RESIDENT_HOUSING_PURPOSES.includes(purpose);

/**
 * Main IMT calculation engine for the Portuguese property tax system.
 * * This function uses a "Global Potentials" strategy: it calculates the tax
 * obligations for the entire property price under different legal regimes
 * (Standard vs. Youngun Exemption) and then distributes those totals
 * proportionally among buyers based on their ownership share.
 *
 * @param {Object} params
 * @param {number} params.price - The total acquisition price of the property.
 * @param {string} params.purpose - The property purpose (e.g., "hpp", "secondary", "rustic", "other").
 * @param {Array<Object>} params.buyers - List of buyers: { isYoungunEligible: boolean,
 *   isOffshoreEntity: boolean, isNonResident: boolean, share: number }.
 * @param {number} [params.year] - The fiscal year to use. Defaults to the current calendar year.
 * * @returns {Object} An object containing:
 * @property {Object} total - The aggregated totals for imt, stampDuty, deduction, and combined total.
 * @property {Array<Object>} breakdown - Detailed calculation for each buyer, including their
 * specific tax, share of the global deduction, and applied marginal rate.
 */
export const calculateImt = ({
  price,
  purpose,
  isInUrbanRehabArea,
  postRehabFirstTransfer,
  buyers = [],
  year,
  location,
}) => {
  const regionData = imtData[year][location];

  const { stampDutyRate, tables, youngunStampDutyExemptionThreshold, nonResidentRate } = regionData;
  const globalStandard = computeTax(price, price, tables[purpose]);
  const globalYoungun = computeTax(price, price, tables.jovem);
  const isNonResidentRateApplicable = nonResidentRateApplies(regionData, purpose);

  const lastProgressiveUpTo = Math.max(
    ...tables.jovem.filter((b) => !b.type || b.type !== "flat").map((b) => b.upTo),
  );

  let totalImt = 0;
  let totalStampDuty = 0;
  let totalDeduction = 0;
  let totalNonResidentPotentialRefund = 0;
  const breakdown = [];

  buyers.forEach((buyer, index) => {
    const share = buyer.share ?? 1 / buyers.length;
    const buyerValue = price * share;

    let buyerImt = 0;
    let buyerDeduction = 0;
    let appliedRate = 0;

    let isOffshoreApplied = false;
    let isNonResidentApplied = false;
    let nonResidentPotentialRefund = 0;
    let isRehabApplied = false;
    let postRehabFirstTransferApplied = false;
    let isYoungunRateApplied = false;
    let isYoungunStampDutyApplied = false;

    const isNonResidentHousing = buyer.isNonResident && isNonResidentRateApplicable;

    if (buyer.isOffshoreEntity) {
      // n.º 4 first: n.º 10 applies "sem prejuízo do disposto no n.º 4", so 10% wins.
      buyerImt = buyerValue * OFFSHORE_RATE;
      appliedRate = OFFSHORE_RATE;
      isOffshoreApplied = true;
    } else if (isNonResidentHousing) {
      // CIMT Art. 17.º n.º 10: flat rate, "não se aplicando qualquer isenção ou redução"
      // — overrides the rehab/post-rehab/jovem exemptions and reductions below.
      buyerImt = buyerValue * nonResidentRate;
      appliedRate = nonResidentRate;
      isNonResidentApplied = true;
      // CIMT Art. 17.º n.º 11/12 — the carve-outs of n.º 10 b)/c) never reduce
      // the tax due at the deed; they let the buyer reclaim, on request (filed
      // within 6 months of the trigger), the difference versus the n.º 1
      // standard rates. Estimated here; never subtracted from the amount due.
      nonResidentPotentialRefund = Math.max(0, buyerImt - globalStandard.amount * share);
    } else if (isInUrbanRehabArea) {
      buyerImt = 0;
      appliedRate = 0;
      isRehabApplied = true;
    } else if (postRehabFirstTransfer && purpose === "hpp") {
      buyerImt = 0;
      appliedRate = 0;
      postRehabFirstTransferApplied = true;
    } else if (buyer.isYoungunEligible && globalYoungun) {
      buyerImt = globalYoungun.amount * share;
      buyerDeduction = globalYoungun.deduction * share;
      appliedRate = globalYoungun.marginalRate;
      isYoungunRateApplied = true;
    } else {
      buyerImt = globalStandard.amount * share;
      buyerDeduction = globalStandard.deduction * share;
      appliedRate = globalStandard.marginalRate;
    }

    const fullStampDuty = buyerValue * stampDutyRate;
    let finalStampDuty = fullStampDuty;

    if (
      !buyer.isOffshoreEntity &&
      !isNonResidentApplied &&
      buyer.isYoungunEligible &&
      price <= lastProgressiveUpTo
    ) {
      const maxDiscount = youngunStampDutyExemptionThreshold * share * stampDutyRate;
      finalStampDuty = Math.max(0, fullStampDuty - maxDiscount);
      if (finalStampDuty < fullStampDuty) {
        isYoungunStampDutyApplied = true;
      }
    }

    totalImt += buyerImt;
    totalDeduction += buyerDeduction;
    totalStampDuty += finalStampDuty;
    totalNonResidentPotentialRefund += nonResidentPotentialRefund;

    breakdown.push({
      buyerIndex: index,
      share,
      value: roundCurrency(buyerValue),
      imt: roundCurrency(buyerImt),
      stampDuty: roundCurrency(finalStampDuty),
      total: roundCurrency(buyerImt + finalStampDuty),
      status: {
        isOffshore: isOffshoreApplied,
        isNonResident: isNonResidentApplied,
        isEligibleForRehabilitationExemption: isRehabApplied,
        isEligibleForPostRehabFirstSaleExemption: postRehabFirstTransferApplied,
        isYoungunImt: isYoungunRateApplied,
        isYoungunStampDuty: isYoungunStampDutyApplied,
      },
      meta: {
        rate: appliedRate,
        deduction: roundCurrency(buyerDeduction),
        nonResidentPotentialRefund: roundCurrency(nonResidentPotentialRefund),
      },
    });
  });

  return {
    total: {
      imt: roundCurrency(totalImt),
      stampDuty: roundCurrency(totalStampDuty),
      total: roundCurrency(totalImt + totalStampDuty),
      deduction: roundCurrency(totalDeduction),
      nonResidentPotentialRefund: roundCurrency(totalNonResidentPotentialRefund),
    },
    breakdown,
  };
};
