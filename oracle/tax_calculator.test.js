import { describe, expect, it } from "vitest";

import { computeTax } from "./tax_calculator.js";

describe("Test computeTax", () => {
  const mockTable = [
    { upTo: 100, rate: 0.0 },
    { upTo: 200, rate: 0.1 },
    { upTo: 300, rate: 0.2 },
    { upTo: Infinity, rate: 0.05, type: "flat" },
  ];

  it("should return 0 when the total value is 0 (avoiding NaN)", () => {
    const result = computeTax(0, 0, mockTable);
    expect(result.amount).toBe(0);
    expect(result.marginalRate).toBe(mockTable[0].rate);
    expect(result.deduction).toBe(0);
  });

  it("should return 0 for values in the first bracket (0%)", () => {
    const result = computeTax(50, 50, mockTable);
    expect(result.amount).toBe(0);
    expect(result.marginalRate).toBe(0);
  });

  it("should calculate progressive tax correctly across two brackets", () => {
    const result = computeTax(150, 150, mockTable);
    expect(result.amount).toBe(5);
    expect(result.marginalRate).toBe(0.1);
  });

  it("should calculate progressive tax correctly across three brackets", () => {
    const result = computeTax(250, 250, mockTable);
    expect(result.amount).toBe(20);
    expect(result.marginalRate).toBe(0.2);
  });

  it("should jump to flat rate logic when the threshold is hit", () => {
    const result = computeTax(400, 400, mockTable);
    expect(result.amount).toBe(20);
    expect(result.marginalRate).toBe(0.05);
  });

  it("should apply proportionality correctly for partial shares", () => {
    const result = computeTax(125, 250, mockTable);
    expect(result.amount).toBe(10);
  });
});
