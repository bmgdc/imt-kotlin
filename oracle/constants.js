export const RAW_IMT_DATA = {
  2024: {
    tables: {
      hpp: [
        { upTo: 101917, rate: 0.0 },
        { upTo: 139412, rate: 0.02 },
        { upTo: 190086, rate: 0.05 },
        { upTo: 316772, rate: 0.07 },
        { upTo: 633453, rate: 0.08 },
        { upTo: 1102920, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      secondary: [
        { upTo: 101917, rate: 0.01 },
        { upTo: 139412, rate: 0.02 },
        { upTo: 190086, rate: 0.05 },
        { upTo: 316772, rate: 0.07 },
        { upTo: 607528, rate: 0.08 },
        { upTo: 1102920, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      jovem: [
        { upTo: 316772, rate: 0.0 },
        { upTo: 633453, rate: 0.08 },
        { upTo: 1102920, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      rustic: [{ upTo: Infinity, rate: 0.05, type: "flat" }],
      other: [{ upTo: Infinity, rate: 0.065, type: "flat" }],
    },
    stampDutyRate: 0.008,
    youngunStampDutyExemptionThreshold: 316772,
  },
  2025: {
    tables: {
      hpp: [
        { upTo: 104261, rate: 0.0 },
        { upTo: 142618, rate: 0.02 },
        { upTo: 194458, rate: 0.05 },
        { upTo: 324058, rate: 0.07 },
        { upTo: 648022, rate: 0.08 },
        { upTo: 1128287, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      secondary: [
        { upTo: 104261, rate: 0.01 },
        { upTo: 142618, rate: 0.02 },
        { upTo: 194458, rate: 0.05 },
        { upTo: 324058, rate: 0.07 },
        { upTo: 648022, rate: 0.08 },
        { upTo: 1128287, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      jovem: [
        { upTo: 324058, rate: 0.0 },
        { upTo: 648022, rate: 0.08 },
        { upTo: 1128287, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      rustic: [{ upTo: Infinity, rate: 0.05, type: "flat" }],
      other: [{ upTo: Infinity, rate: 0.065, type: "flat" }],
    },
    stampDutyRate: 0.008,
    youngunStampDutyExemptionThreshold: 324058,
  },
  2026: {
    tables: {
      hpp: [
        { upTo: 106346, rate: 0.0 },
        { upTo: 145470, rate: 0.02 },
        { upTo: 198347, rate: 0.05 },
        { upTo: 330539, rate: 0.07 },
        { upTo: 660982, rate: 0.08 },
        { upTo: 1150853, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      secondary: [
        { upTo: 106346, rate: 0.01 },
        { upTo: 145470, rate: 0.02 },
        { upTo: 198347, rate: 0.05 },
        { upTo: 330539, rate: 0.07 },
        { upTo: 633931, rate: 0.08 },
        { upTo: 1150853, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      jovem: [
        { upTo: 330539, rate: 0.0 },
        { upTo: 660982, rate: 0.08 },
        { upTo: 1150853, rate: 0.06, type: "flat" },
        { upTo: Infinity, rate: 0.075, type: "flat" },
      ],
      rustic: [{ upTo: Infinity, rate: 0.05, type: "flat" }],
      other: [{ upTo: Infinity, rate: 0.065, type: "flat" }],
    },
    stampDutyRate: 0.008,
    youngunStampDutyExemptionThreshold: 330539,
    // CIMT Art. 17.º n.º 10 (added by Decreto-Lei n.º 97/2026, de 20 de maio):
    // flat rate on the full value for non-resident buyers of urban housing.
    // Only present for years in which the rule is in force — the engine treats
    // its absence as "rule does not apply for this year".
    nonResidentRate: 0.075,
  },
};
