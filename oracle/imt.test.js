import { describe, expect, it } from "vitest";

import { calculateImt, nonResidentRateApplies } from "./imt.js";
import { imtData } from "./tax_utils.js";

describe("IMT Calculator General Behavior", () => {
  it("should default to current year constants when year is omitted", () => {
    const currentYear = new Date().getFullYear();
    const location = "islands";
    const { youngunStampDutyExemptionThreshold } = imtData[currentYear][location];

    const result = calculateImt({
      location,
      price: youngunStampDutyExemptionThreshold + 1,
      purpose: "hpp",
      buyers: [{ isYoungunEligible: true, share: 1 }],
      year: new Date().getFullYear(),
    });

    expect(result.total.imt).toBeGreaterThan(0);
  });
});

describe("IMT 2025 Calculator Logic", () => {
  const year = 2025;
  const location = "islands";
  const { youngunStampDutyExemptionThreshold } = imtData[year][location];

  it("should calculate zero tax for a youngun HPP buyer at the threshold", () => {
    const result = calculateImt({
      location,
      price: youngunStampDutyExemptionThreshold,
      purpose: "hpp",
      buyers: [{ isYoungunEligible: true, share: 1 }],
      year,
    });
    expect(result.total.imt).toBe(0);
    expect(result.total.stampDuty).toBe(0);
    expect(result.total.total).toBe(0);
  });
  it("should calculate zero tax for a youngun HPP buyer below threshold", () => {
    const result = calculateImt({
      location,
      price: youngunStampDutyExemptionThreshold - 0.01,
      purpose: "hpp",
      buyers: [{ isYoungunEligible: true, share: 1 }],
      year: 2025,
    });
    expect(result.total.imt).toBe(0);
    expect(result.total.stampDuty).toBe(0);
    expect(result.total.total).toBe(0);
  });
  it("should calculate 0.09€ tax for a youngun HPP buyer 1 euro above threshold", () => {
    const result = calculateImt({
      location,
      price: youngunStampDutyExemptionThreshold + 1,
      purpose: "hpp",
      buyers: [{ isYoungunEligible: true, share: 1 }],
      year: 2025,
    });
    expect(result.total.imt).toBe(0.08);
    expect(result.total.stampDuty).toBe(0.01);
    expect(result.total.total).toBe(0.09);
  });
  it("should correctly split taxes for a mixed couple where both buyers are youngun-eligible", () => {
    const result = calculateImt({
      location: "mainland",
      price: 400_000,
      purpose: "hpp",
      buyers: [
        { isYoungunEligible: true, share: 0.5 },
        { isYoungunEligible: true, share: 0.5 },
      ],
      year: 2025,
    });
    const buyer_1_breakdown = result.breakdown[0];
    const buyer_2_breakdown = result.breakdown[1];
    expect(buyer_1_breakdown.status.isYoungunImt).toBe(true);
    expect(buyer_1_breakdown.imt).toBe(3037.68);
    expect(buyer_1_breakdown.stampDuty).toBe(303.77);
    expect(buyer_1_breakdown.meta.rate).toBe(0.08);
    expect(buyer_1_breakdown.meta.deduction).toBe(12962.32);
    expect(buyer_2_breakdown.status.isYoungunImt).toBe(true);
    expect(buyer_2_breakdown.imt).toBe(3037.68);
    expect(buyer_2_breakdown.stampDuty).toBe(303.77);
    expect(buyer_2_breakdown.meta.rate).toBe(0.08);
    expect(buyer_2_breakdown.meta.deduction).toBe(12962.32);
    expect(result.total.imt).toBe(6075.36);
    expect(buyer_1_breakdown.imt + buyer_2_breakdown.imt).toBe(result.total.imt);
    expect(buyer_1_breakdown.stampDuty + buyer_2_breakdown.stampDuty).toBe(result.total.stampDuty);
    expect(result.total.total).toBe(6682.9);
    expect(result.total.deduction).toBeCloseTo(25924.64, 2);
    expect(buyer_1_breakdown.meta.deduction + buyer_2_breakdown.meta.deduction).toBeCloseTo(
      result.total.deduction,
      2,
    );
  });
  it("should correctly split taxes for a mixed couple with equal shares where only one buyer is youngun-eligible", () => {
    const result = calculateImt({
      location: "mainland",
      price: 400_000,
      purpose: "hpp",
      buyers: [
        { isYoungunEligible: true, share: 0.5 },
        { isYoungunEligible: false, share: 0.5 },
      ],
      year: 2025,
    });
    const buyer_1_breakdown = result.breakdown[0];
    const buyer_2_breakdown = result.breakdown[1];
    expect(buyer_1_breakdown.status.isYoungunImt).toBe(true);
    expect(buyer_1_breakdown.imt).toBe(3037.68);
    expect(buyer_1_breakdown.stampDuty).toBe(303.77);
    expect(buyer_1_breakdown.meta.rate).toBe(0.08);
    expect(buyer_1_breakdown.meta.deduction).toBe(12962.32);
    expect(buyer_2_breakdown.status.isYoungunImt).toBe(false);
    expect(buyer_2_breakdown.imt).toBe(9253.25);
    expect(buyer_2_breakdown.stampDuty).toBe(1600);
    expect(buyer_2_breakdown.meta.rate).toBe(0.08);
    expect(buyer_2_breakdown.meta.deduction).toBe(6746.75);
    expect(result.total.imt).toBe(12290.93);
    expect(buyer_1_breakdown.imt + buyer_2_breakdown.imt).toBeCloseTo(result.total.imt, 2);
    expect(buyer_1_breakdown.stampDuty + buyer_2_breakdown.stampDuty).toBeCloseTo(result.total.stampDuty, 2);
    expect(result.total.total).toBe(14194.7);
    expect(result.total.deduction).toBeCloseTo(19709.07, 2);
    expect(buyer_1_breakdown.meta.deduction + buyer_2_breakdown.meta.deduction).toBeCloseTo(
      result.total.deduction,
      2,
    );
  });
  it("should correctly split taxes for a mixed couple with unequal shares where only one buyer is youngun-eligible", () => {
    const result = calculateImt({
      location: "mainland",
      price: 450_000,
      purpose: "hpp",
      buyers: [
        { isYoungunEligible: true, share: 0.75 },
        { isYoungunEligible: false, share: 0.25 },
      ],
      year: 2025,
    });
    const buyer_1_breakdown = result.breakdown[0];
    const buyer_2_breakdown = result.breakdown[1];
    expect(buyer_1_breakdown.status.isYoungunImt).toBe(true);
    expect(buyer_1_breakdown.imt).toBe(7556.52);
    expect(buyer_1_breakdown.stampDuty).toBe(755.65);
    expect(buyer_1_breakdown.meta.rate).toBe(0.08);
    expect(buyer_1_breakdown.meta.deduction).toBe(19443.48);
    expect(buyer_2_breakdown.status.isYoungunImt).toBe(false);
    expect(buyer_2_breakdown.imt).toBe(5626.63);
    expect(buyer_2_breakdown.stampDuty).toBe(900);
    expect(buyer_2_breakdown.meta.rate).toBe(0.08);
    expect(buyer_2_breakdown.meta.deduction).toBe(3373.38);
    expect(result.total.imt).toBe(13183.15);
    expect(buyer_1_breakdown.imt + buyer_2_breakdown.imt).toBeCloseTo(result.total.imt, 2);
    expect(buyer_1_breakdown.stampDuty + buyer_2_breakdown.stampDuty).toBeCloseTo(result.total.stampDuty, 2);
    expect(result.total.total).toBe(14838.8);
    expect(result.total.deduction).toBeCloseTo(22816.86, 2);
    expect(buyer_1_breakdown.meta.deduction + buyer_2_breakdown.meta.deduction).toBeCloseTo(
      result.total.deduction,
      2,
    );
  });
  it("should apply secondary home rates", () => {
    const result = calculateImt({
      location: "mainland",
      price: 500_000,
      purpose: "secondary",
      buyers: [{ share: 0.6 }, { share: 0.4 }],
      year: 2025,
    });
    const buyer_1_breakdown = result.breakdown[0];
    const buyer_2_breakdown = result.breakdown[1];
    expect(buyer_1_breakdown.imt).toBe(16529.47);
    expect(buyer_1_breakdown.stampDuty).toBe(2400);
    expect(buyer_2_breakdown.imt).toBe(11019.64);
    expect(buyer_2_breakdown.stampDuty).toBe(1600);
    expect(result.total.imt).toBe(27549.11);
    expect(buyer_1_breakdown.imt + buyer_2_breakdown.imt).toBeCloseTo(result.total.imt, 2);
    expect(buyer_1_breakdown.stampDuty + buyer_2_breakdown.stampDuty).toBeCloseTo(result.total.stampDuty, 2);
    expect(result.total.total).toBe(31549.11);

    expect(result.total.deduction).toBeCloseTo(12450.89, 2);
    expect(buyer_1_breakdown.meta.rate).toBe(0.08);
    expect(buyer_1_breakdown.meta.deduction).toBe(7470.53);
    expect(buyer_2_breakdown.meta.rate).toBe(0.08);
    expect(buyer_2_breakdown.meta.deduction).toBe(4980.36);
    expect(buyer_1_breakdown.meta.deduction + buyer_2_breakdown.meta.deduction).toBeCloseTo(12450.89, 2);
  });
  it("should apply identical IMT and full Stamp Duty for high-value youngun purchases in flat rate", () => {
    const result = calculateImt({
      location: "mainland",
      price: 850_000,
      purpose: "hpp",
      buyers: [{ isYoungunEligible: true, share: 1 }],
      year: 2025,
    });

    expect(result.total.imt).toBe(51000);
    expect(result.total.stampDuty).toBe(6800);
    expect(result.breakdown[0].status.isYoungunStampDuty).toBe(false);
  });
  it("should apply identical IMT but discounted Stamp Duty for medium-value youngun purchases", () => {
    const result = calculateImt({
      location: "mainland",
      price: 500_000,
      purpose: "hpp",
      buyers: [{ isYoungunEligible: true, share: 1 }],
      year: 2025,
    });

    expect(result.total.imt).toBe(14075.36);
    expect(result.total.stampDuty).toBe(1407.54);
    expect(result.breakdown[0].status.isYoungunStampDuty).toBe(true);
  });
  it("should calculate flat rates for rustic properties", () => {
    const price = 230_000;
    const result = calculateImt({
      location,
      price,
      purpose: "rustic",
      buyers: [{ share: 1 }],
      year: 2025,
    });
    expect(result.total.imt).toBe(11500);
    expect(result.total.stampDuty).toBe(1840);
    expect(result.total.total).toBe(13340);
    expect(result.breakdown[0].meta.deduction).toBe(0);
  });
  it("should calculate flat 6.5% rate for other urban properties", () => {
    const result = calculateImt({
      location,
      price: 200_000,
      purpose: "other",
      buyers: [{ share: 1 }],
      year: 2025,
    });

    expect(result.total.imt).toBe(13000);
    expect(result.total.stampDuty).toBe(1600);
    expect(result.total.total).toBe(14600);
  });
});

describe("IMT Priority & Regime Collisions", () => {
  const year = 2025;
  const location = "mainland";

  it("should prioritize Offshore Penalty (10%) over Rehab Exemption", () => {
    const result = calculateImt({
      location,
      price: 500_000,
      purpose: "hpp",
      isInUrbanRehabArea: true,
      buyers: [
        {
          share: 1,
          isOffshoreEntity: true,
        },
      ],
      year,
    });

    const buyer = result.breakdown[0];

    expect(buyer.imt).toBe(50_000);
    expect(buyer.status.isOffshore).toBe(true);
    expect(buyer.status.isEligibleForRehabilitationExemption).toBe(false);
  });

  it("should combine Rehab Exemption (IMT=0) with Youngun Benefit (SD Discount)", () => {
    const result = calculateImt({
      location,
      price: 300_000,
      purpose: "hpp",
      isInUrbanRehabArea: true,
      buyers: [
        {
          share: 1,
          isYoungunEligible: true,
        },
      ],
      year,
    });

    const buyer = result.breakdown[0];

    expect(buyer.imt).toBe(0);
    expect(buyer.status.isEligibleForRehabilitationExemption).toBe(true);
    expect(buyer.stampDuty).toBe(0);
    expect(buyer.status.isYoungunStampDuty).toBe(true);
  });

  it("should apply Rehab Exemption (IMT=0) but Standard Stamp Duty if NOT Youngun", () => {
    const result = calculateImt({
      location,
      price: 200_000,
      purpose: "hpp",
      isInUrbanRehabArea: true,
      buyers: [
        {
          share: 1,
          isYoungunEligible: false,
        },
      ],
      year,
    });

    const buyer = result.breakdown[0];

    expect(buyer.imt).toBe(0);

    expect(buyer.stampDuty).toBe(1600);
    expect(buyer.status.isYoungunStampDuty).toBe(false);
  });
  it("should apply Rehab for IMT and Youngun for Stamp Duty independently", () => {
    const result = calculateImt({
      location: "mainland",
      price: 300_000,
      purpose: "hpp",
      isInUrbanRehabArea: true,
      buyers: [{ isYoungunEligible: true, share: 1 }],
      year: 2025,
    });

    const buyer = result.breakdown[0];
    expect(buyer.imt).toBe(0);
    expect(buyer.status.isEligibleForRehabilitationExemption).toBe(true);
    expect(buyer.status.isYoungunImt).toBe(false);
    expect(buyer.status.isYoungunStampDuty).toBe(true);
  });
  it("should apply first post-rehabilitation IMT exemption with Youngun benefit", () => {
    const result = calculateImt({
      location: "mainland",
      price: 400_000,
      purpose: "hpp",
      postRehabFirstTransfer: true,
      buyers: [{ isYoungunEligible: true, share: 1 }],
      year: 2025,
    });

    const buyer = result.breakdown[0];
    expect(buyer.imt).toBe(0);
    expect(buyer.status.isEligibleForPostRehabFirstSaleExemption).toBe(true);
    expect(buyer.stampDuty).toBe(607.54);
    expect(buyer.status.isYoungunStampDuty).toBe(true);
  });
});

describe("IMT Non-Resident Buyer (CIMT Art. 17.º n.º 10)", () => {
  const year = 2026;

  describe("nonResidentRateApplies scope guard", () => {
    it("should apply to urban housing purposes for years carrying the rate", () => {
      expect(nonResidentRateApplies(imtData[2026].mainland, "hpp")).toBe(true);
      expect(nonResidentRateApplies(imtData[2026].mainland, "secondary")).toBe(true);
    });

    it("should not apply to rustic or other urban property", () => {
      expect(nonResidentRateApplies(imtData[2026].mainland, "rustic")).toBe(false);
      expect(nonResidentRateApplies(imtData[2026].mainland, "other")).toBe(false);
    });

    it("should not apply for years before the rule entered into force", () => {
      expect(nonResidentRateApplies(imtData[2025].mainland, "hpp")).toBe(false);
      expect(nonResidentRateApplies(imtData[2024].mainland, "hpp")).toBe(false);
    });
  });

  it("should apply a flat 7.5% with no deduction for a non-resident HPP buyer", () => {
    const result = calculateImt({
      location: "mainland",
      price: 500_000,
      purpose: "hpp",
      buyers: [{ isNonResident: true, share: 1 }],
      year,
    });

    const buyer = result.breakdown[0];
    expect(buyer.imt).toBe(37_500);
    expect(buyer.stampDuty).toBe(4_000);
    expect(buyer.total).toBe(41_500);
    expect(buyer.meta.rate).toBe(0.075);
    expect(buyer.meta.deduction).toBe(0);
    expect(buyer.status.isNonResident).toBe(true);
    expect(result.total.imt).toBe(37_500);
    expect(result.total.total).toBe(41_500);
    // Refund estimate (n.º 11): 7.5% paid minus the n.º 1 standard amount.
    expect(buyer.meta.nonResidentPotentialRefund).toBeCloseTo(11_263.35, 2);
    expect(result.total.nonResidentPotentialRefund).toBeCloseTo(11_263.35, 2);
  });

  it("should apply the flat 7.5% to non-resident secondary-housing buyers too", () => {
    const result = calculateImt({
      location: "mainland",
      price: 400_000,
      purpose: "secondary",
      buyers: [{ isNonResident: true, share: 1 }],
      year,
    });

    const buyer = result.breakdown[0];
    expect(buyer.imt).toBe(30_000);
    expect(buyer.status.isNonResident).toBe(true);
    expect(buyer.meta.rate).toBe(0.075);
    // Refund baseline follows the declared purpose's n.º 1 table (secondary here).
    expect(result.total.nonResidentPotentialRefund).toBeCloseTo(10_699.89, 2);
  });

  it("should NOT apply the flat rate to non-housing purposes (rustic land)", () => {
    const result = calculateImt({
      location: "mainland",
      price: 230_000,
      purpose: "rustic",
      buyers: [{ isNonResident: true, share: 1 }],
      year,
    });

    const buyer = result.breakdown[0];
    // Falls through to the normal 5% rustic rate; non-resident status is inert here.
    expect(buyer.imt).toBe(11_500);
    expect(buyer.meta.rate).toBe(0.05);
    expect(buyer.status.isNonResident).toBe(false);
    expect(result.total.nonResidentPotentialRefund).toBe(0);
  });

  it("should apply the flat 7.5% regardless of location (rate is not island-scaled)", () => {
    const result = calculateImt({
      location: "islands",
      price: 500_000,
      purpose: "hpp",
      buyers: [{ isNonResident: true, share: 1 }],
      year,
    });

    expect(result.breakdown[0].imt).toBe(37_500);
    expect(result.breakdown[0].meta.rate).toBe(0.075);
    // The refund baseline uses the islands' own (×1.25-scaled) n.º 1 table.
    expect(result.total.nonResidentPotentialRefund).toBeCloseTo(14_704.22, 2);
  });

  it("should prioritize Offshore Penalty (10%) over the Non-Resident rate (7.5%)", () => {
    const result = calculateImt({
      location: "mainland",
      price: 500_000,
      purpose: "hpp",
      buyers: [{ isOffshoreEntity: true, isNonResident: true, share: 1 }],
      year,
    });

    const buyer = result.breakdown[0];
    expect(buyer.imt).toBe(50_000);
    expect(buyer.status.isOffshore).toBe(true);
    expect(buyer.status.isNonResident).toBe(false);
    expect(result.total.nonResidentPotentialRefund).toBe(0);
  });

  it("should prioritize the Non-Resident rate over the Rehab Exemption", () => {
    const result = calculateImt({
      location: "mainland",
      price: 500_000,
      purpose: "hpp",
      isInUrbanRehabArea: true,
      buyers: [{ isNonResident: true, share: 1 }],
      year,
    });

    const buyer = result.breakdown[0];
    expect(buyer.imt).toBe(37_500);
    expect(buyer.status.isNonResident).toBe(true);
    expect(buyer.status.isEligibleForRehabilitationExemption).toBe(false);
    // n.º 11 refunds down to the n.º 1 rates — not to the (excluded) exemption's zero.
    expect(result.total.nonResidentPotentialRefund).toBeCloseTo(11_263.35, 2);
  });

  it("should prioritize the Non-Resident rate over IMT Jovem and suppress its Stamp Duty discount", () => {
    const result = calculateImt({
      location: "mainland",
      price: 300_000,
      purpose: "hpp",
      buyers: [{ isNonResident: true, isYoungunEligible: true, share: 1 }],
      year,
    });

    const buyer = result.breakdown[0];
    expect(buyer.imt).toBe(22_500);
    expect(buyer.stampDuty).toBe(2_400);
    expect(buyer.status.isNonResident).toBe(true);
    expect(buyer.status.isYoungunImt).toBe(false);
    expect(buyer.status.isYoungunStampDuty).toBe(false);
    // The refund baseline stays the standard table, not the jovem table.
    expect(buyer.meta.nonResidentPotentialRefund).toBeCloseTo(11_957.96, 2);
  });

  it("should split correctly between a non-resident and a standard resident buyer", () => {
    const result = calculateImt({
      location: "mainland",
      price: 400_000,
      purpose: "hpp",
      buyers: [{ isNonResident: true, share: 0.5 }, { share: 0.5 }],
      year,
    });

    const nonResident = result.breakdown[0];
    const resident = result.breakdown[1];

    expect(nonResident.imt).toBe(15_000);
    expect(nonResident.stampDuty).toBe(1_600);
    expect(nonResident.meta.rate).toBe(0.075);
    expect(nonResident.meta.deduction).toBe(0);
    expect(nonResident.status.isNonResident).toBe(true);
    // Refund computed on the non-resident's share only.
    expect(nonResident.meta.nonResidentPotentialRefund).toBeCloseTo(5_881.67, 2);

    expect(resident.imt).toBe(9_118.33);
    expect(resident.meta.rate).toBe(0.08);
    expect(resident.meta.deduction).toBe(6_881.68);
    expect(resident.status.isNonResident).toBe(false);
    expect(resident.meta.nonResidentPotentialRefund).toBe(0);

    expect(result.total.imt).toBe(24_118.33);
    expect(result.total.stampDuty).toBe(3_200);
    expect(result.total.total).toBe(27_318.33);
    expect(result.total.deduction).toBe(6_881.68);
    expect(result.total.nonResidentPotentialRefund).toBeCloseTo(5_881.67, 2);
  });

  it("should estimate a zero refund when the standard regime already taxes at 7.5%", () => {
    const result = calculateImt({
      location: "mainland",
      price: 1_200_000,
      purpose: "hpp",
      buyers: [{ isNonResident: true, share: 1 }],
      year,
    });

    expect(result.total.imt).toBe(90_000);
    expect(result.breakdown[0].status.isNonResident).toBe(true);
    expect(result.total.nonResidentPotentialRefund).toBe(0);
  });

  it("should have no effect for fiscal years before the rule entered into force (DL 97/2026)", () => {
    const result2025 = calculateImt({
      location: "mainland",
      price: 400_000,
      purpose: "hpp",
      buyers: [{ isNonResident: true, share: 1 }],
      year: 2025,
    });

    // Standard 2025 hpp result — the flag is inert before 2026.
    expect(result2025.total.imt).toBe(18_506.5);
    expect(result2025.breakdown[0].status.isNonResident).toBe(false);
    expect(result2025.total.nonResidentPotentialRefund).toBe(0);

    const result2024 = calculateImt({
      location: "mainland",
      price: 400_000,
      purpose: "hpp",
      buyers: [{ isNonResident: true, share: 1 }],
      year: 2024,
    });

    expect(result2024.total.imt).toBe(18_809.86);
    expect(result2024.breakdown[0].status.isNonResident).toBe(false);
    expect(result2024.total.nonResidentPotentialRefund).toBe(0);
  });
});
