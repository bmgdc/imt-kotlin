import { describe, expect, it } from "vitest";

import { enrichTable, imtData } from "./tax_utils.js";

const mockTable = [
  { upTo: 100, rate: 0.0 },
  { upTo: 200, rate: 0.1 },
  { upTo: 300, rate: 0.2 },
  { upTo: Infinity, rate: 0.05, type: "flat" },
];

describe("tax_utils.enrichTable", () => {
  it("should not mutate the original table and keep all properties", () => {
    const enrichedTable = enrichTable(mockTable);

    expect(enrichedTable).not.toBe(mockTable);
    expect(enrichedTable[3].type).toBe("flat");
    expect(enrichedTable[3].rate).toBe(0.05);
  });
  it("should enrich `mockTable` with the correct deduction values", () => {
    const enrichedTable = enrichTable(mockTable);

    expect(enrichedTable[0].deduction).toBe(0);
    expect(enrichedTable[1].deduction).toBe(10);
    expect(enrichedTable[2].deduction).toBe(30);
    expect(enrichedTable[3].deduction).toBe(0);
  });
});

describe("tax_utils.imtData nonResidentRate propagation", () => {
  it("should carry the 2026 non-resident rate into both regions without island scaling", () => {
    expect(imtData[2026].mainland.nonResidentRate).toBe(0.075);
    expect(imtData[2026].islands.nonResidentRate).toBe(0.075);
  });

  it("should leave years before the rule entered into force without a non-resident rate", () => {
    expect(imtData[2024].mainland.nonResidentRate).toBeUndefined();
    expect(imtData[2025].mainland.nonResidentRate).toBeUndefined();
  });

  it("should keep the non-resident rate on the latest year's data while the rule is in force", () => {
    // Guard: the rule applies through data presence, so forgetting to carry
    // `nonResidentRate` into a new year's RAW_IMT_DATA entry would silently
    // drop it. Fails loudly instead — remove only if the law is repealed.
    const latestYear = Math.max(...Object.keys(imtData).map(Number));
    expect(imtData[latestYear].mainland.nonResidentRate).toBe(0.075);
  });
});
