/*
 * IMT calculator frontend — a reduced emulation of frontend-reference/ per its
 * NOTES.md. Layout, interaction rules, and copy come from the original React
 * components (strings-en.jsx verbatim); the structural twist is that calculation
 * is server-side: input changes are debounced (~250 ms) into POST /api/imt, and
 * the reference bracket tables come from GET /api/tables/{year}/{location} once
 * per year/location change. API `upTo: null` means an unbounded bracket and is
 * decoded back to Infinity at this boundary.
 */

const YEAR = new Date().getFullYear();

// --- Strings (from strings-en.jsx, verbatim) --------------------------------

const t = {
  form: {
    location: {
      values: { mainland: "Mainland Portugal", islands: "Islands" },
    },
    purpose: {
      values: {
        hpp: "Primary Residence",
        secondary: "Secondary Residence or Rental",
        rustic: "Rustic Property",
        other: "Others",
      },
    },
    exemptions: {
      isInUrbanRehabArea: { label: "Property in an Urban Rehabilitation Area" },
      postRehabFirstTransfer: { label: "First Transfer Following Urban Rehabilitation" },
    },
    buyers: {
      label: "Buyer",
      share: { label: "Share", warning: "Total shares must equal 100%. (Current: " },
      jovemBenefit: { label: "IMT Jovem" },
      taxHavenEntity: { label: "Tax Haven Entity" },
      nonResidentBuyer: { label: "Non-Resident Buyer" },
    },
  },
  results: {
    showDetails: "Show details",
    hideDetails: "Hide details",
    breakdownTitle: "Breakdown per Buyer",
    imt: "IMT",
    stampDuty: "Stamp Duty",
  },
  tables: {
    adpositions: { from: "From", over: "Over", to: "to", upTo: "Up to" },
    header: {
      price: "Value subject to IMT",
      rate: "Marginal Rate to Apply",
      deduction: "Portion to Deduct",
    },
    sectionTitleSingular: "Reference Table",
    sectionTitlePlural: "Reference Tables",
  },
};

// Tooltip legal content (from strings-en.jsx JSX, markup converted to HTML).
const tooltips = {
  price: `
    <div class="space-y-2 leading-relaxed">
      <p class="font-semibold">Taxable value for IMT purposes:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>IMT is assessed on the <strong>higher</strong> of:
          <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>The declared acquisition price</li>
            <li>The tax registration value (VPT)</li>
          </ul>
        </li>
      </ul>
      <p class="font-semibold text-amber-300">Important:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>This calculator assumes the declared price is the relevant taxable value</li>
        <li>If the VPT is higher, IMT will be recalculated by the tax authority</li>
      </ul>
      <p class="pt-2 text-[11px] text-gray-300 italic">Legal basis: Art. 12.º, n.º 1 CIMT</p>
    </div>`,
  isInUrbanRehabArea: `
    <div class="space-y-2 leading-relaxed">
      <p class="font-semibold">Applies when:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>The property is located in an officially designated <strong>Urban Rehabilitation Area (ARU)</strong></li>
        <li>The buyer commits to carrying out certified rehabilitation works within the statutory timeframe</li>
      </ul>
      <p class="font-semibold text-amber-300">Effect:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>Full exemption from IMT on acquisition</li>
      </ul>
      <p class="font-semibold text-red-300">Does not apply if:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>The buyer is an entity domiciled in a tax haven</li>
        <li>Rehabilitation works are not initiated or certified as required</li>
      </ul>
      <p class="pt-2 text-[11px] text-gray-300 italic">Legal basis: Estatuto dos Benefícios Fiscais Art. 45º, 1</p>
    </div>`,
  postRehabFirstTransfer: `
    <div class="space-y-2 leading-relaxed">
      <p class="font-semibold">Applies when:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>This is the <strong>first sale</strong> of the property after certified rehabilitation works</li>
        <li>The rehabilitation was carried out under the ARU legal framework</li>
        <li>The property is acquired for <strong>Primary Residence (HPP)</strong></li>
      </ul>
      <p class="font-semibold text-amber-300">Effect:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>Full exemption from IMT on the first transfer</li>
      </ul>
      <p class="font-semibold text-red-300">Does not apply to:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>Secondary residences or investment acquisitions</li>
        <li>Properties acquired for rental or resale</li>
        <li>Buyers that are entities domiciled in tax havens</li>
      </ul>
      <p class="pt-2 text-[11px] text-gray-300 italic">Legal basis: Estatuto dos Benefícios Fiscais Art. 45º, 2-c)</p>
    </div>`,
  jovem: `
    <div class="space-y-2 leading-relaxed">
      <p class="font-semibold">Applies when:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>The buyer is <strong>35 years old or younger</strong></li>
        <li>The acquisition is of the buyer’s <strong>first Primary Residence (HPP)</strong></li>
        <li>The acquisition value is within the legally defined price limits</li>
      </ul>
      <p class="font-semibold text-amber-300">Effect:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>Total or partial exemption from IMT</li>
        <li>Partial exemption from Stamp Duty, up to the legal threshold</li>
      </ul>
      <p class="font-semibold text-red-300">Does not apply if:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>The property is not intended for Primary Residence</li>
        <li>The buyer has previously owned a Primary Residence</li>
        <li>The buyer is an entity or a tax haven resident</li>
      </ul>
      <p class="pt-2 text-[11px] text-gray-300 italic">Legal basis: CIMT Art. 17º, CIS Artigo 7º-A</p>
    </div>`,
  offshore: `
    <div class="space-y-2 leading-relaxed">
      <p class="font-semibold">Applies when:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>The buyer is an entity domiciled in a jurisdiction classified as a <strong>privileged tax regime</strong></li>
      </ul>
      <p class="font-semibold text-amber-300">Effect:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>IMT is always due at a <strong>flat rate of 10%</strong></li>
      </ul>
      <p class="font-semibold text-red-300">Consequences:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>All exemptions and reduced rates are excluded</li>
        <li>Urban Rehabilitation benefits do not apply</li>
        <li>IMT Jovem does not apply</li>
      </ul>
      <p class="pt-2 text-[11px] text-gray-300 italic">Legal basis: CIMT Art. 17º</p>
    </div>`,
  nonResident: `
    <div class="space-y-2 leading-relaxed">
      <p class="font-semibold">Applies when:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>The buyer is <strong>not a tax resident in Portugal</strong> (Art. 16.º of the IRS Code)</li>
        <li>The acquisition is of an <strong>urban property destined exclusively for housing</strong></li>
      </ul>
      <p class="font-semibold text-amber-300">Effect:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>IMT is due at a <strong>flat rate of 7.5%</strong></li>
        <li>No exemption or reduction applies (including IMT Jovem and rehabilitation)</li>
      </ul>
      <p class="font-semibold text-green-300">May be refunded if:</p>
      <ul class="list-disc list-inside space-y-1">
        <li>The buyer becomes a tax resident in Portugal within 2 years</li>
        <li>The property is leased for housing within 6 months of acquisition, at rent within the legal limits, for at least 36 months during the first 5 years</li>
        <li>The refund request is filed with the tax authority within 6 months of meeting the condition</li>
      </ul>
      <p class="pt-2 text-[11px] text-gray-300 italic">Legal basis: CIMT Art. 17º, n.º 10-12 (Decreto-Lei n.º 97/2026)</p>
    </div>`,
};

// --- State -------------------------------------------------------------------

const state = {
  price: "",
  location: "mainland",
  purpose: "hpp",
  isInUrbanRehabArea: false,
  postRehabFirstTransfer: false,
  buyers: [
    { share: 1, isJovemEligible: false, isOffshoreEntity: false, isNonResident: false },
  ],
  showBreakdown: false,
};

let regionTables = null; // { tables, nonResidentRate } from GET /api/tables
let results = null; // last POST /api/imt response

// Mirrors the oracle's roundCurrency for display formatting only.
const roundCurrency = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const numericPrice = () => Number(state.price) || 0;

const isHousingPurpose = (purpose) => purpose === "hpp" || purpose === "secondary";

// --- Small render helpers ----------------------------------------------------

const el = (id) => document.getElementById(id);

const tooltipHtml = (content) => `
  <div class="group/tooltip relative flex items-center">
    <span class="text-gray-400 hover:text-blue-900 transition-colors cursor-help">ⓘ</span>
    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none normal-case [&_*]:text-xs [&_*]:font-normal">
      ${content}
      <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>`;

const toggleHtml = ({ id, label, tooltip, active, disabled }) => `
  <div class="flex items-center gap-2 select-none p-2 rounded-lg -ml-2 ${
    disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-neutral-50"
  }">
    <label for="${id}" class="flex items-center gap-3 cursor-inherit">
      <input id="${id}" type="checkbox" class="sr-only" ${active ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <div class="w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 shrink-0 ${
        active ? "bg-blue-900 border-blue-900 shadow-sm" : "bg-white border-gray-300"
      }">${active ? '<span class="text-white font-bold text-xs">✓</span>' : ""}</div>
      <span class="text-sm font-bold leading-tight ${active ? "text-blue-900" : "text-gray-700"}">${label}</span>
    </label>
    ${tooltip ? tooltipHtml(tooltip) : ""}
  </div>`;

// --- Form rendering ----------------------------------------------------------

function renderExemptionToggles() {
  el("exemption-toggles").innerHTML =
    toggleHtml({
      id: "toggle-rehab",
      label: t.form.exemptions.isInUrbanRehabArea.label,
      tooltip: tooltips.isInUrbanRehabArea,
      active: state.isInUrbanRehabArea,
      disabled: false,
    }) +
    toggleHtml({
      id: "toggle-post-rehab",
      label: t.form.exemptions.postRehabFirstTransfer.label,
      tooltip: tooltips.postRehabFirstTransfer,
      active: state.postRehabFirstTransfer,
      disabled: state.purpose !== "hpp",
    });

  el("toggle-rehab").addEventListener("change", () => {
    const turningOn = !state.isInUrbanRehabArea;
    state.isInUrbanRehabArea = turningOn;
    if (turningOn) state.postRehabFirstTransfer = false;
    renderExemptionToggles();
    scheduleRecalc();
  });
  const postRehab = el("toggle-post-rehab");
  if (!postRehab.disabled) {
    postRehab.addEventListener("change", () => {
      const turningOn = !state.postRehabFirstTransfer;
      state.postRehabFirstTransfer = turningOn;
      if (turningOn) state.isInUrbanRehabArea = false;
      renderExemptionToggles();
      scheduleRecalc();
    });
  }
}

function shareWarningHtml() {
  const totalShare = state.buyers.reduce((sum, b) => sum + b.share, 0);
  const isShareValid = Math.abs(totalShare - 1) < 0.001;
  if (isShareValid) return "";
  return `
    <div class="text-amber-600 text-sm font-medium bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
      <span>ⓘ</span>
      ${t.form.buyers.share.warning + (totalShare * 100).toFixed(0)}%)
    </div>`;
}

function renderBuyers() {
  const multi = state.buyers.length > 1;

  el("buyers-list").innerHTML =
    state.buyers
      .map((buyer, idx) => {
        const shareInput = multi
          ? `
          <div class="w-full sm:w-32 shrink-0">
            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">${t.form.buyers.share.label} (%)</label>
            <input type="number" data-share-input="${idx}" value="${Math.round(buyer.share * 100)}"
                   class="w-full p-3 rounded-xl border-2 border-neutral-100 focus:border-blue-900 outline-none transition bg-white">
          </div>`
          : "";
        const removeButton = multi
          ? `<button data-remove-buyer="${idx}" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition p-2">✕</button>`
          : "";
        return `
        <div class="p-4 bg-neutral-50 rounded-xl border border-neutral-100 relative group">
          <div class="flex flex-col sm:flex-row gap-6">
            ${shareInput}
            <div class="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              ${toggleHtml({
                id: `buyer-${idx}-jovem`,
                label: t.form.buyers.jovemBenefit.label,
                tooltip: tooltips.jovem,
                active: buyer.isJovemEligible,
                disabled: state.purpose !== "hpp" || buyer.isOffshoreEntity || buyer.isNonResident,
              })}
              ${toggleHtml({
                id: `buyer-${idx}-offshore`,
                label: t.form.buyers.taxHavenEntity.label,
                tooltip: tooltips.offshore,
                active: buyer.isOffshoreEntity,
                disabled: buyer.isJovemEligible || buyer.isNonResident,
              })}
              ${toggleHtml({
                id: `buyer-${idx}-non-resident`,
                label: t.form.buyers.nonResidentBuyer.label,
                tooltip: tooltips.nonResident,
                active: buyer.isNonResident,
                disabled: !isHousingPurpose(state.purpose) || buyer.isJovemEligible || buyer.isOffshoreEntity,
              })}
            </div>
          </div>
          ${removeButton}
        </div>`;
      })
      .join("") +
    `<div id="share-warning-slot">${shareWarningHtml()}</div>`;

  state.buyers.forEach((buyer, idx) => {
    const jovem = el(`buyer-${idx}-jovem`);
    if (!jovem.disabled) {
      jovem.addEventListener("change", () => {
        Object.assign(state.buyers[idx], {
          isJovemEligible: !buyer.isJovemEligible,
          isOffshoreEntity: false,
          isNonResident: false,
        });
        renderBuyers();
        scheduleRecalc();
      });
    }
    const offshore = el(`buyer-${idx}-offshore`);
    if (!offshore.disabled) {
      offshore.addEventListener("change", () => {
        Object.assign(state.buyers[idx], {
          isOffshoreEntity: !buyer.isOffshoreEntity,
          isJovemEligible: false,
          isNonResident: false,
        });
        renderBuyers();
        scheduleRecalc();
      });
    }
    const nonResident = el(`buyer-${idx}-non-resident`);
    if (!nonResident.disabled) {
      nonResident.addEventListener("change", () => {
        Object.assign(state.buyers[idx], {
          isNonResident: !buyer.isNonResident,
          isJovemEligible: false,
          isOffshoreEntity: false,
        });
        renderBuyers();
        scheduleRecalc();
      });
    }
  });

  document.querySelectorAll("[data-share-input]").forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.shareInput);
      state.buyers[idx].share = e.target.value / 100;
      el("share-warning-slot").innerHTML = shareWarningHtml();
      scheduleRecalc();
    });
  });

  document.querySelectorAll("[data-remove-buyer]").forEach((button) => {
    button.addEventListener("click", (e) => {
      if (state.buyers.length <= 1) return;
      const idx = Number(e.currentTarget.dataset.removeBuyer);
      state.buyers = state.buyers.filter((_, i) => i !== idx);
      if (state.buyers.length === 1) state.buyers[0].share = 1;
      renderBuyers();
      scheduleRecalc();
    });
  });
}

// --- Results & details rendering ----------------------------------------------

function renderResults() {
  if (!results) return;
  el("result-imt").textContent = `${results.total.imt}€`;
  el("result-stamp-duty").textContent = `${results.total.stampDuty}€`;
  el("result-total").textContent = `${results.total.total}€`;

  const hasNonResidentRateApplied = results.breakdown.some((row) => row.status.isNonResident);
  el("non-resident-note").classList.toggle("hidden", !hasNonResidentRateApplied);
  el("result-refund").textContent = `${results.total.nonResidentPotentialRefund}€`;
}

function breakdownHtml() {
  const rows = results.breakdown
    .map(
      (row, i) => `
      <tr class="hover:bg-neutral-50 transition-colors">
        <td class="px-6 py-4 font-bold text-blue-900">${t.form.buyers.label} ${i + 1}</td>
        <td class="px-6 py-4 text-gray-600">${(row.share * 100).toFixed(1)}%</td>
        <td class="px-6 py-4 text-gray-600">${row.imt}€</td>
        <td class="px-6 py-4 text-gray-600">${row.stampDuty}€</td>
        <td class="px-6 py-4 font-bold text-blue-900 text-right">${row.total}€</td>
      </tr>`,
    )
    .join("");
  return `
    <div class="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
      <div class="p-4 bg-blue-50 border-b border-blue-100">
        <h3 class="font-bold text-blue-900">${t.results.breakdownTitle}</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-gray-500 font-bold uppercase text-[10px] tracking-widest bg-white border-b border-neutral-100">
            <tr>
              <th class="px-6 py-4">#</th>
              <th class="px-6 py-4">${t.form.buyers.share.label}</th>
              <th class="px-6 py-4">${t.results.imt}</th>
              <th class="px-6 py-4">${t.results.stampDuty}</th>
              <th class="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-50">${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function referenceTableHtml(tableData, label, isSecondary) {
  const price = numericPrice();
  const rows = tableData
    .map((bracket, idx) => {
      const upTo = bracket.upTo === null ? Infinity : bracket.upTo;
      const previousUpToRaw = idx === 0 ? 0 : tableData[idx - 1].upTo;
      const previousLimit = previousUpToRaw === null ? Infinity : previousUpToRaw;

      const isActive = price <= upTo && (idx === 0 ? price >= 0 : price > previousLimit);
      const isSingleRowFlatRate = tableData.length === 1 && upTo === Infinity;

      let limitText = "";
      if (isSingleRowFlatRate) {
        limitText = price > 0 ? `${roundCurrency(price)}€` : "Valor de Aquisição";
      } else if (idx === 0) {
        limitText = `${t.tables.adpositions.upTo} ${roundCurrency(upTo)}€`;
      } else if (upTo === Infinity) {
        limitText = `${t.tables.adpositions.over} ${roundCurrency(previousLimit)}€`;
      } else {
        limitText = `${t.tables.adpositions.from} ${roundCurrency(previousLimit)}€ ${t.tables.adpositions.to} ${roundCurrency(upTo)}€`;
      }

      return `
      <tr class="transition-colors ${isActive ? (isSecondary ? "bg-teal-50" : "bg-blue-50") : "hover:bg-gray-50"}">
        <td class="px-8 py-5 font-medium ${isActive ? "text-blue-900" : "text-gray-700"}">${limitText}</td>
        <td class="px-8 py-5 text-center text-gray-600">
          <div class="flex items-center justify-center gap-2">
            <span class="font-bold">${(bracket.rate * 100).toFixed(1)}%</span>
            ${
              bracket.rate === 0
                ? '<span class="px-2 py-0.5 text-[10px] font-black uppercase text-green-700 bg-green-100 rounded-md">Isento</span>'
                : ""
            }
          </div>
        </td>
        <td class="px-8 py-5 text-right text-gray-500 font-mono">${
          bracket.deduction > 0 ? `${roundCurrency(bracket.deduction)}€` : "—"
        }</td>
      </tr>`;
    })
    .join("");

  return `
    <div class="rounded-2xl overflow-hidden border border-blue-100 shadow-sm bg-white">
      <div class="px-8 py-5 border-b border-blue-100 ${isSecondary ? "bg-teal-700" : "bg-blue-900"}">
        <h4 class="text-white font-bold text-xl tracking-tight">${label}</h4>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-base text-left">
          <thead>
            <tr class="bg-neutral-50 text-gray-500 font-bold uppercase text-xs tracking-widest border-b border-neutral-100">
              <th class="px-8 py-5">${t.tables.header.price}</th>
              <th class="px-8 py-5 text-center">${t.tables.header.rate}</th>
              <th class="px-8 py-5 text-right">${t.tables.header.deduction}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function renderDetails() {
  el("details-toggle-label").textContent = state.showBreakdown
    ? t.results.hideDetails
    : t.results.showDetails;
  el("details-caret").classList.toggle("rotate-180", state.showBreakdown);
  el("details-section").classList.toggle("hidden", !state.showBreakdown);
  if (!state.showBreakdown) return;

  const breakdownSection = el("breakdown-section");
  if (results && state.buyers.length > 1) {
    breakdownSection.innerHTML = breakdownHtml();
    breakdownSection.classList.remove("hidden");
  } else {
    breakdownSection.classList.add("hidden");
  }

  const tablesSection = el("tables-section");
  if (!regionTables) {
    tablesSection.classList.add("hidden");
    return;
  }

  // Display rules from ImtCalculator.js. Non-resident buyers of housing pay a flat
  // 7.5% (CIMT Art. 17.º n.º 10), so the progressive tables don't describe them.
  const usesNonResidentFlatRate = (b) =>
    b.isNonResident && regionTables.nonResidentRate != null && isHousingPurpose(state.purpose);
  const isStandardTableNeeded = state.buyers.some(
    (b) =>
      !b.isOffshoreEntity &&
      !usesNonResidentFlatRate(b) &&
      !state.isInUrbanRehabArea &&
      (!b.isJovemEligible || !regionTables.tables["jovem"]),
  );
  const isJovemTableNeeded = state.buyers.some(
    (b) => !b.isOffshoreEntity && !state.isInUrbanRehabArea && b.isJovemEligible,
  );

  const tablesToDisplay = [];
  if (regionTables.tables[state.purpose] && isStandardTableNeeded) {
    tablesToDisplay.push({
      data: regionTables.tables[state.purpose],
      label: `${t.form.location.values[state.location]} - ${t.form.purpose.values[state.purpose]}`,
      isSecondary: false,
    });
  }
  if (state.purpose === "hpp" && isJovemTableNeeded && regionTables.tables["jovem"]) {
    tablesToDisplay.push({
      data: regionTables.tables["jovem"],
      label: `${t.form.location.values[state.location]} - IMT Jovem`,
      isSecondary: true,
    });
  }

  if (tablesToDisplay.length === 0) {
    tablesSection.classList.add("hidden");
    return;
  }
  tablesSection.classList.remove("hidden");
  el("tables-title").textContent =
    tablesToDisplay.length > 1 ? t.tables.sectionTitlePlural : t.tables.sectionTitleSingular;
  el("tables-container").innerHTML = tablesToDisplay
    .map((table) => referenceTableHtml(table.data, table.label, table.isSecondary))
    .join("");
}

// --- Server calls --------------------------------------------------------------

let recalcTimer = null;

function scheduleRecalc() {
  clearTimeout(recalcTimer);
  recalcTimer = setTimeout(recalc, 250);
}

async function recalc() {
  try {
    const response = await fetch("/api/imt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: numericPrice(),
        purpose: state.purpose,
        isInUrbanRehabArea: state.isInUrbanRehabArea,
        postRehabFirstTransfer: state.postRehabFirstTransfer,
        buyers: state.buyers,
        year: YEAR,
        location: state.location,
      }),
    });
    if (!response.ok) {
      console.error("POST /api/imt failed:", await response.text());
      return;
    }
    results = await response.json();
    renderResults();
    renderDetails();
  } catch (err) {
    console.error("POST /api/imt failed:", err);
  }
}

async function fetchTables() {
  try {
    const response = await fetch(`/api/tables/${YEAR}/${state.location}`);
    if (!response.ok) {
      console.error("GET /api/tables failed:", await response.text());
      return;
    }
    regionTables = await response.json();
    renderDetails();
  } catch (err) {
    console.error("GET /api/tables failed:", err);
  }
}

// --- Init -----------------------------------------------------------------------

function init() {
  el("year-badge").textContent = YEAR;
  el("price-tooltip-slot").outerHTML = tooltipHtml(tooltips.price);

  el("location").addEventListener("change", (e) => {
    state.location = e.target.value;
    fetchTables();
    scheduleRecalc();
  });

  el("purpose").addEventListener("change", (e) => {
    const newPurpose = e.target.value;
    state.purpose = newPurpose;
    const isHousing = isHousingPurpose(newPurpose);
    if (newPurpose !== "hpp") {
      state.buyers = state.buyers.map((b) => ({
        ...b,
        isJovemEligible: false,
        isNonResident: isHousing ? b.isNonResident : false,
      }));
    }
    renderExemptionToggles();
    renderBuyers();
    scheduleRecalc();
  });

  el("price").addEventListener("input", (e) => {
    state.price = e.target.value;
    scheduleRecalc();
    // The bracket highlight follows the price.
    renderDetails();
  });

  el("add-buyer").addEventListener("click", () => {
    const currentTotal = state.buyers.reduce((sum, b) => sum + b.share, 0);
    const remaining = Math.round((1 - currentTotal) * 10000) / 10000;
    state.buyers.push({
      share: Math.max(0, remaining),
      isJovemEligible: false,
      isOffshoreEntity: false,
      isNonResident: false,
    });
    renderBuyers();
    scheduleRecalc();
  });

  el("details-toggle").addEventListener("click", () => {
    state.showBreakdown = !state.showBreakdown;
    renderDetails();
  });

  renderExemptionToggles();
  renderBuyers();
  renderDetails();
  fetchTables();
  recalc();
}

init();
