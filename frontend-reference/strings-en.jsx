// Extracted verbatim from realtor_blueprint src/i18n/en.js — the `tools.imt` subtree.
// The JSX tooltips carry legal content (CIMT and EBF citations): preserve their text
// when porting, even though the JSX markup itself will be replaced.
// eslint-disable-next-line no-unused-vars
export const imtStrings = {
      title: "IMT Calculator",
      description:
        "Estimate the taxes associated with buying a property in Portugal, including IMT and Stamp Duty, adjusted for the latest state budget rules.",
      badge: "Calculator",
      disclaimer:
        "*Disclaimer: This simulator is for informational purposes only and does not constitute legal or financial advice. Calculations are based on general rules and may vary depending on specific circumstances or legislative changes. Always consult a professional.",
      form: {
        location: {
          label: "Property Location",
          values: {
            mainland: "Mainland Portugal",
            islands: "Islands",
          },
        },
        purpose: {
          label: "Purpose",
          values: {
            hpp: "Primary Residence",
            secondary: "Secondary Residence or Rental",
            rustic: "Rustic Property",
            other: "Others",
          },
        },
        price: {
          label: "Property Price",
          tooltip: (
            <div className="space-y-2 leading-relaxed">
              <p className="font-semibold">Taxable value for IMT purposes:</p>

              <ul className="list-disc list-inside space-y-1">
                <li>
                  IMT is assessed on the <strong>higher</strong> of:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>The declared acquisition price</li>
                    <li>The tax registration value (VPT)</li>
                  </ul>
                </li>
              </ul>

              <p className="font-semibold text-amber-300">Important:</p>

              <ul className="list-disc list-inside space-y-1">
                <li>This calculator assumes the declared price is the relevant taxable value</li>
                <li>If the VPT is higher, IMT will be recalculated by the tax authority</li>
              </ul>

              <p className="pt-2 text-[11px] text-gray-300 italic">Legal basis: Art. 12.º, n.º 1 CIMT</p>
            </div>
          ),
        },
        exemptions: {
          isInUrbanRehabArea: {
            label: "Property in an Urban Rehabilitation Area",
            tooltip: (
              <div className="space-y-2 leading-relaxed">
                <p className="font-semibold">Applies when:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>
                    The property is located in an officially designated{" "}
                    <strong> Urban Rehabilitation Area (ARU)</strong>
                  </li>
                  <li>
                    The buyer commits to carrying out certified rehabilitation works within the statutory
                    timeframe
                  </li>
                </ul>

                <p className="font-semibold text-amber-300">Effect:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>Full exemption from IMT on acquisition</li>
                </ul>

                <p className="font-semibold text-red-300">Does not apply if:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>The buyer is an entity domiciled in a tax haven</li>
                  <li>Rehabilitation works are not initiated or certified as required</li>
                </ul>

                <p className="pt-2 text-[11px] text-gray-300 italic">
                  Legal basis: Estatuto dos Benefícios Fiscais Art. 45º, 1
                </p>
              </div>
            ),
          },
          postRehabFirstTransfer: {
            label: "First Transfer Following Urban Rehabilitation",
            tooltip: (
              <div className="space-y-2 leading-relaxed">
                <p className="font-semibold">Applies when:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>
                    This is the <strong>first sale</strong> of the property after certified rehabilitation
                    works
                  </li>
                  <li>The rehabilitation was carried out under the ARU legal framework</li>
                  <li>
                    The property is acquired for <strong>Primary Residence (HPP)</strong>
                  </li>
                </ul>

                <p className="font-semibold text-amber-300">Effect:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>Full exemption from IMT on the first transfer</li>
                </ul>

                <p className="font-semibold text-red-300">Does not apply to:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>Secondary residences or investment acquisitions</li>
                  <li>Properties acquired for rental or resale</li>
                  <li>Buyers that are entities domiciled in tax havens</li>
                </ul>

                <p className="pt-2 text-[11px] text-gray-300 italic">
                  Legal basis: Estatuto dos Benefícios Fiscais Art. 45º, 2-c)
                </p>
              </div>
            ),
          },
        },
        buyers: {
          label: "Buyer",
          share: {
            label: "Share",
            warning: "Total shares must equal 100%. (Current: ",
          },
          addBuyer: "Add buyer",
          remove: "Remove",
          youngunBenefit: {
            label: "IMT Jovem",
            tooltip: (
              <div className="space-y-2 leading-relaxed">
                <p className="font-semibold">Applies when:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>
                    The buyer is <strong>35 years old or younger</strong>
                  </li>
                  <li>
                    The acquisition is of the buyer’s <strong>first Primary Residence (HPP)</strong>
                  </li>
                  <li>The acquisition value is within the legally defined price limits</li>
                </ul>

                <p className="font-semibold text-amber-300">Effect:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>Total or partial exemption from IMT</li>
                  <li>Partial exemption from Stamp Duty, up to the legal threshold</li>
                </ul>

                <p className="font-semibold text-red-300">Does not apply if:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>The property is not intended for Primary Residence</li>
                  <li>The buyer has previously owned a Primary Residence</li>
                  <li>The buyer is an entity or a tax haven resident</li>
                </ul>

                <p className="pt-2 text-[11px] text-gray-300 italic">
                  Legal basis: CIMT Art. 17º, CIS Artigo 7º-A
                </p>
              </div>
            ),
          },
          taxHavenEntity: {
            label: "Tax Haven Entity",
            tooltip: (
              <div className="space-y-2 leading-relaxed">
                <p className="font-semibold">Applies when:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>
                    The buyer is an entity domiciled in a jurisdiction classified as a
                    <strong> privileged tax regime</strong>
                  </li>
                </ul>

                <p className="font-semibold text-amber-300">Effect:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>
                    IMT is always due at a <strong>flat rate of 10%</strong>
                  </li>
                </ul>

                <p className="font-semibold text-red-300">Consequences:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>All exemptions and reduced rates are excluded</li>
                  <li>Urban Rehabilitation benefits do not apply</li>
                  <li>IMT Jovem does not apply</li>
                </ul>

                <p className="pt-2 text-[11px] text-gray-300 italic">Legal basis: CIMT Art. 17º</p>
              </div>
            ),
          },
          nonResidentBuyer: {
            label: "Non-Resident Buyer",
            tooltip: (
              <div className="space-y-2 leading-relaxed">
                <p className="font-semibold">Applies when:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>
                    The buyer is <strong>not a tax resident in Portugal</strong> (Art. 16.º of the IRS Code)
                  </li>
                  <li>
                    The acquisition is of an <strong>urban property destined exclusively for housing</strong>
                  </li>
                </ul>

                <p className="font-semibold text-amber-300">Effect:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>
                    IMT is due at a <strong>flat rate of 7.5%</strong>
                  </li>
                  <li>No exemption or reduction applies (including IMT Jovem and rehabilitation)</li>
                </ul>

                <p className="font-semibold text-green-300">May be refunded if:</p>

                <ul className="list-disc list-inside space-y-1">
                  <li>The buyer becomes a tax resident in Portugal within 2 years</li>
                  <li>
                    The property is leased for housing within 6 months of acquisition, at rent within the
                    legal limits, for at least 36 months during the first 5 years
                  </li>
                  <li>
                    The refund request is filed with the tax authority within 6 months of meeting the
                    condition
                  </li>
                </ul>

                <p className="pt-2 text-[11px] text-gray-300 italic">
                  Legal basis: CIMT Art. 17º, n.º 10-12 (Decreto-Lei n.º 97/2026)
                </p>
              </div>
            ),
          },
        },
      },
      results: {
        total: "Total to pay",
        imt: "IMT",
        stampDuty: "Stamp Duty",
        showDetails: "Show details",
        hideDetails: "Hide details",
        breakdownTitle: "Breakdown per Buyer",
        nonResidentNote: {
          title: "Non-resident flat rate (7.5%) applied",
          refundLabel: "Potentially refundable later",
          description:
            "The full amount is due at the deed. If the buyer becomes a tax resident in Portugal within 2 years, or leases the property for housing within 6 months of acquisition (at rent within the legal limits, for at least 36 of the first 60 months), the difference versus the standard rates can be reclaimed from the tax authority. The request must be filed within 6 months of meeting the condition (CIMT Art. 17º, n.º 11-12).",
        },
      },
      seo: {
        title: "Portugal IMT & Stamp Duty Calculator ({year})",
        description:
          "Calculate your property purchase taxes in Portugal. Up-to-date including IMT Jovem and urban rehabilitation exemptions.",
      },
      tables: {
        adpositions: {
          from: "From",
          over: "Over",
          to: "to",
          upTo: "Up to",
        },
        header: {
          price: "Value subject to IMT",
          rate: "Marginal Rate to Apply",
          deduction: "Portion to Deduct",
          imt: "IMT",
          stampDuty: "Stamp Duty",
        },
        sectionSubtitle: "The highlighted row indicates the applied bracket.",
        sectionTitleSingular: "Reference Table",
        sectionTitlePlural: "Reference Tables",
        uniqueRate: "Flat rate of",
      },
};
