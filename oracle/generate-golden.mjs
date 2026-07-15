/**
 * Golden-master generator for the Kotlin port's parity suite.
 *
 * Runs the reference `calculateImt` over a systematic case matrix and writes
 * `oracle/golden.json`. This is the only editable file in `oracle/` — the
 * implementation modules it imports are vendored read-only, and `golden.json`
 * must never be hand-edited (regenerate it with `node oracle/generate-golden.mjs`).
 *
 * JSON convention: JSON has no Infinity. Any unbounded value (JS `Infinity` or
 * `-Infinity`) is serialized as `null` in golden.json. Consumers must map null
 * back to an unbounded value at the boundary. (With the current data no case
 * input or output actually contains Infinity — the replacer is a guarantee,
 * not a workaround.)
 *
 * Case matrix, per the session prompt (prompts/01-golden-master.md):
 *   every year in RAW_IMT_DATA
 *   × { mainland, islands }
 *   × { hpp, secondary, rustic, other }
 *   × buyer configurations (singles for each flag, singles with combined
 *     flags to pin the precedence rules, and 0.7/0.3 pairs mixing flags)
 *   × { no flags, isInUrbanRehabArea, postRehabFirstTransfer }
 *   × price points derived from that year/location's bracket tables:
 *     each progressive bracket boundary, boundary + 0.01, one mid-bracket
 *     point per bracket, one point inside each flat tier, plus 0 and 1.
 *
 * Price points are taken from the purpose's table AND the jovem table, because
 * the engine consults `tables.jovem` for jovem-eligible buyers regardless of
 * purpose, and the jovem stamp-duty discount cuts off at the jovem table's
 * last progressive boundary. Islands tables arrive already ×1.25-scaled via
 * `imtData`, so the boundaries here are the effective ones.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { RAW_IMT_DATA } from "./constants.js";
import { calculateImt } from "./imt.js";
import { imtData } from "./tax_utils.js";

const PURPOSES = ["hpp", "secondary", "rustic", "other"];
const LOCATIONS = ["mainland", "islands"];

/** Buyer with all flags explicit, so golden.json records the full input. */
const buyer = (flags, share) => ({
  isYoungunEligible: false,
  isOffshoreEntity: false,
  isNonResident: false,
  share,
  ...flags,
});

const BUYER_CONFIGS = [
  { name: "single-standard", buyers: [buyer({}, 1)] },
  { name: "single-jovem", buyers: [buyer({ isYoungunEligible: true }, 1)] },
  { name: "single-offshore", buyers: [buyer({ isOffshoreEntity: true }, 1)] },
  { name: "single-nonresident", buyers: [buyer({ isNonResident: true }, 1)] },
  // Combined flags on one buyer: pin the precedence chain (offshore > non-resident
  // > everything else) documented in imt.js.
  {
    name: "single-jovem-nonresident",
    buyers: [buyer({ isYoungunEligible: true, isNonResident: true }, 1)],
  },
  {
    name: "single-offshore-nonresident",
    buyers: [buyer({ isOffshoreEntity: true, isNonResident: true }, 1)],
  },
  // Two buyers, shares 0.7/0.3, mixing flags: pin the share-proportional math
  // when different regimes coexist on one deed.
  {
    name: "pair-standard-jovem",
    buyers: [buyer({}, 0.7), buyer({ isYoungunEligible: true }, 0.3)],
  },
  {
    name: "pair-jovem-offshore",
    buyers: [buyer({ isYoungunEligible: true }, 0.7), buyer({ isOffshoreEntity: true }, 0.3)],
  },
  {
    name: "pair-offshore-nonresident",
    buyers: [buyer({ isOffshoreEntity: true }, 0.7), buyer({ isNonResident: true }, 0.3)],
  },
  {
    name: "pair-nonresident-standard",
    buyers: [buyer({ isNonResident: true }, 0.7), buyer({}, 0.3)],
  },
];

const FLAG_CONFIGS = [
  { name: "none", isInUrbanRehabArea: false, postRehabFirstTransfer: false },
  { name: "rehab", isInUrbanRehabArea: true, postRehabFirstTransfer: false },
  { name: "postrehab", isInUrbanRehabArea: false, postRehabFirstTransfer: true },
];

/**
 * Price points for one (year, location, purpose) cell, derived from the
 * effective (enriched, islands-scaled) tables. A Set deduplicates points that
 * coincide across the purpose and jovem tables.
 */
const pricePointsFor = (regionData, purpose) => {
  const prices = new Set([0, 1]);
  const tables = new Set([regionData.tables[purpose], regionData.tables.jovem]);

  for (const table of tables) {
    let previousLimit = 0;
    for (const bracket of table) {
      if (bracket.type === "flat") {
        if (bracket.upTo === Infinity) {
          // Unbounded flat tier: one point comfortably inside it.
          prices.add(previousLimit > 0 ? previousLimit * 1.5 : 500000);
        } else {
          prices.add((previousLimit + bracket.upTo) / 2);
          previousLimit = bracket.upTo;
        }
      } else {
        prices.add(bracket.upTo);
        prices.add(bracket.upTo + 0.01);
        prices.add((previousLimit + bracket.upTo) / 2);
        previousLimit = bracket.upTo;
      }
    }
  }

  return [...prices].sort((a, b) => a - b);
};

/** JSON has no Infinity: unbounded values become null (see file header). */
const infinityToNull = (key, value) =>
  value === Infinity || value === -Infinity ? null : value;

const years = Object.keys(RAW_IMT_DATA)
  .map(Number)
  .sort((a, b) => a - b);

const seen = new Set();
const cases = [];

for (const year of years) {
  for (const location of LOCATIONS) {
    const regionData = imtData[year][location];
    for (const purpose of PURPOSES) {
      const prices = pricePointsFor(regionData, purpose);
      for (const buyerConfig of BUYER_CONFIGS) {
        for (const flagConfig of FLAG_CONFIGS) {
          for (const price of prices) {
            const input = {
              price,
              purpose,
              isInUrbanRehabArea: flagConfig.isInUrbanRehabArea,
              postRehabFirstTransfer: flagConfig.postRehabFirstTransfer,
              buyers: buyerConfig.buyers,
              year,
              location,
            };

            const key = JSON.stringify(input, infinityToNull);
            if (seen.has(key)) continue;
            seen.add(key);

            cases.push({
              id: `${year}/${location}/${purpose}/${buyerConfig.name}/${flagConfig.name}/${price}`,
              input,
              output: calculateImt(input),
            });
          }
        }
      }
    }
  }
}

// One case per line: keeps the file valid JSON, semi-readable, and line-diffable.
const caseLines = cases.map((c) => "    " + JSON.stringify(c, infinityToNull));
const json = [
  "{",
  '  "_comment": "Generated by oracle/generate-golden.mjs — never hand-edit. Unbounded values are represented as null.",',
  `  "caseCount": ${cases.length},`,
  '  "cases": [',
  caseLines.join(",\n"),
  "  ]",
  "}",
  "",
].join("\n");

const outPath = join(dirname(fileURLToPath(import.meta.url)), "golden.json");
writeFileSync(outPath, json);

console.log(`Wrote ${cases.length} cases to ${outPath}`);
console.log(
  `Matrix: years=${years.join(",")} × locations=${LOCATIONS.length} × purposes=${PURPOSES.length} × buyerConfigs=${BUYER_CONFIGS.length} × flagConfigs=${FLAG_CONFIGS.length} × per-cell price points (deduplicated)`,
);
