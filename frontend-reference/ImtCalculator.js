"use client";

import { useMemo, useState } from "react";
import { IoCaretDownOutline } from "react-icons/io5";

import { calculateImt, nonResidentRateApplies } from "@/lib/tools/Imt/imt";
import { imtData } from "@/lib/tools/Imt/tax_utils";
import ImtBreakdown from "./ImtBreakdown";
import ImtForm from "./ImtForm";
import ImtReferenceTable from "./ImtReferenceTable";

const ImtCalculator = ({ year = new Date().getFullYear(), t }) => {
  const [price, setPrice] = useState(0);
  const [location, setLocation] = useState("mainland");
  const [purpose, setPurpose] = useState("hpp");
  const [isInUrbanRehabArea, setIsInUrbanRehabArea] = useState(false);
  const [postRehabFirstTransfer, setPostRehabFirstTransfer] = useState(false);
  const [buyers, setBuyers] = useState([
    {
      share: 1,
      isYoungunEligible: false,
      isOffshoreEntity: false,
      isNonResident: false,
    },
  ]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const results = useMemo(() => {
    return calculateImt({
      price: Number(price),
      purpose,
      isInUrbanRehabArea,
      postRehabFirstTransfer,
      buyers,
      year,
      location,
    });
  }, [location, price, purpose, isInUrbanRehabArea, postRehabFirstTransfer, buyers, year]);

  const regionData = imtData[year][location];
  const tablesToDisplay = [];
  // Non-resident buyers of housing pay a flat 7.5% (CIMT Art. 17.º n.º 10), so the
  // progressive reference tables do not describe their liability.
  const usesNonResidentFlatRate = (b) => b.isNonResident && nonResidentRateApplies(regionData, purpose);
  const hasNonResidentRateApplied = results.breakdown.some((row) => row.status.isNonResident);
  const isStandardTableNeeded = buyers.some(
    (b) =>
      !b.isOffshoreEntity &&
      !usesNonResidentFlatRate(b) &&
      !isInUrbanRehabArea &&
      (!b.isYoungunEligible || !regionData?.tables["jovem"]),
  );
  const isYoungunTableNeeded = buyers.some(
    (b) => !b.isOffshoreEntity && !isInUrbanRehabArea && b.isYoungunEligible,
  );

  if (regionData?.tables[purpose] && isStandardTableNeeded) {
    tablesToDisplay.push({
      data: regionData.tables[purpose],
      label: `${t.tools.imt.form.location.values[location]} - ${t.tools.imt.form.purpose.values[purpose]}`,
      isSecondary: false,
    });
  }

  if (purpose === "hpp" && isYoungunTableNeeded && regionData?.tables["jovem"]) {
    tablesToDisplay.push({
      data: regionData.tables["jovem"],
      label: `${t.tools.imt.form.location.values[location]} - IMT Jovem`,
      isSecondary: true,
    });
  }

  const sectionTitle =
    tablesToDisplay.length > 1
      ? t.tools.imt.tables.sectionTitlePlural
      : t.tools.imt.tables.sectionTitleSingular;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <ImtForm
          buyers={buyers}
          location={location}
          isInUrbanRehabArea={isInUrbanRehabArea}
          postRehabFirstTransfer={postRehabFirstTransfer}
          price={price}
          purpose={purpose}
          setBuyers={setBuyers}
          setIsInUrbanRehabArea={setIsInUrbanRehabArea}
          setPostRehabFirstTransfer={setPostRehabFirstTransfer}
          setLocation={setLocation}
          setPrice={setPrice}
          setPurpose={setPurpose}
          t={t}
        />

        {/* RIGHT: RESULTS */}
        <div className="lg:col-span-1 space-y-4">
          <div className="sticky top-8 bg-blue-900 text-white p-6 md:p-8 rounded-2xl shadow-xl space-y-6">
            <h2 className="text-xl font-bold border-b border-blue-800 pb-4">{t.tools.imt.results.total}</h2>

            <dl className="grid grid-cols-2 gap-y-3">
              <dt className="text-blue-100">{t.tools.imt.results.imt}</dt>
              <dd className="text-right font-bold text-white">{results.total.imt}€</dd>

              <dt className="text-blue-100">{t.tools.imt.results.stampDuty}</dt>
              <dd className="text-right font-bold text-white">{results.total.stampDuty}€</dd>

              <dt className="text-lg font-bold uppercase tracking-wider border-t border-blue-800 pt-4">
                Total
              </dt>
              <dd className="text-3xl font-extrabold text-right border-t border-blue-800 pt-4">
                {results.total.total}€
              </dd>
            </dl>

            {hasNonResidentRateApplied && (
              <div className="bg-blue-800/60 border border-blue-700 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-bold">{t.tools.imt.results.nonResidentNote.title}</p>
                <div className="flex justify-between gap-4">
                  <span className="text-blue-100">{t.tools.imt.results.nonResidentNote.refundLabel}</span>
                  <span className="font-bold">{results.total.nonResidentPotentialRefund}€</span>
                </div>
                <p className="text-xs text-blue-100 leading-relaxed">
                  {t.tools.imt.results.nonResidentNote.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER: BREAKDOWN & TABLES */}
      <div className="pt-8 border-t border-neutral-200">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full py-4 px-6 bg-white border-2 border-blue-100 text-blue-900 font-bold rounded-2xl shadow-sm hover:bg-blue-50 transition flex justify-between items-center group"
        >
          <span className="text-lg">
            {showBreakdown ? t.tools.imt.results.hideDetails : t.tools.imt.results.showDetails}
          </span>
          <div className={`transition-transform duration-300 ${showBreakdown ? "rotate-180" : ""}`}>
            <IoCaretDownOutline size={24} />
          </div>
        </button>

        {showBreakdown && (
          <div className="mt-10 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
            {buyers.length > 1 && (
              <section className="space-y-4">
                <ImtBreakdown results={results} t={t.tools.imt} />
              </section>
            )}

            {tablesToDisplay.length > 0 && (
              <section className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-blue-900 tracking-tight">{sectionTitle}</h3>
                  <p className="text-gray-500 max-w-2xl">{t.tools.imt.tables.sectionSubtitle}</p>
                </div>
                <div className="space-y-10">
                  {tablesToDisplay.map((table, idx) => (
                    <ImtReferenceTable
                      key={idx}
                      tableData={table.data}
                      label={table.label}
                      isSecondary={table.isSecondary}
                      price={Number(price)}
                      t={t.tools.imt}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImtCalculator;
