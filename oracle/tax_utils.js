import { RAW_IMT_DATA } from "./constants.js";

/**
 * Rounds a number to two decimal places using the epsilon-adjustment
 * method to ensure mathematical accuracy (avoiding floating-point errors).
 * * @param {number} num - The currency value to round.
 * @returns {number} The value rounded to 2 decimal places.
 */
export const roundCurrency = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Transforms a raw IMT bracket table into an "enriched" version by calculating
 * the static deduction (Parcela a abater) for each tier.
 * * This deduction allows for the calculation of tax using the simplified formula:
 * (Total Value * Marginal Rate) - Deduction.
 * * @param {Array<Object>} table - Array of bracket objects: { upTo: number, rate: number, type?: string }.
 * @returns {Array<Object>} The table with an added 'deduction' property for each progressive bracket.
 */
export const enrichTable = (table) => {
  let accumulatedTax = 0;
  let previousLimit = 0;

  return table.map((bracket) => {
    const range = bracket.upTo - previousLimit;
    const deduction =
      bracket.upTo === Infinity || bracket.type === "flat"
        ? 0
        : roundCurrency(bracket.upTo * bracket.rate - (accumulatedTax + range * bracket.rate));

    const enriched = { ...bracket, deduction };

    if (bracket.upTo !== Infinity && bracket.type !== "flat") {
      accumulatedTax += range * bracket.rate;
      previousLimit = bracket.upTo;
    }

    return enriched;
  });
};

const scaleTableForIslands = (table) => {
  return table.map((bracket) => ({
    ...bracket,
    upTo: bracket.upTo === Infinity ? Infinity : Math.round(bracket.upTo * 1.25),
  }));
};

export const imtData = Object.fromEntries(
  Object.entries(RAW_IMT_DATA).map(([year, data]) => {
    const mainland = {
      ...data,
      tables: Object.fromEntries(
        Object.entries(data.tables).map(([key, table]) => [key, enrichTable(table)]),
      ),
    };

    const islandTablesRaw = Object.fromEntries(
      Object.entries(data.tables).map(([key, table]) => {
        const shouldScale = ["hpp", "secondary", "jovem"].includes(key);
        return [key, shouldScale ? scaleTableForIslands(table) : table];
      }),
    );

    const islands = {
      ...data,
      youngunStampDutyExemptionThreshold: Math.round(data.youngunStampDutyExemptionThreshold * 1.25),
      tables: Object.fromEntries(
        Object.entries(islandTablesRaw).map(([key, table]) => [key, enrichTable(table)]),
      ),
    };

    return [year, { mainland, islands }];
  }),
);
