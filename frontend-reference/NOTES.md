# Frontend reference — what to emulate, what to strip

The files in this directory are the original IMT tool frontend from `realtor_blueprint`
(Bruno's own code), vendored read-only: a Next.js page (`page.js`), four React components,
and `strings-en.jsx` (the `tools.imt` i18n subtree, extracted verbatim — every label and
tooltip, including the legally-cited content). They are the reference the port's frontend
emulates; they are never executed in this repo.

**Target:** a single static `index.html` + `app.js` under `src/main/resources/static/`,
vanilla JS, Tailwind via the Play CDN (`<script src="https://cdn.tailwindcss.com">`), no
build step, no framework. English only (a `pt.js` twin exists in the original project if
ever wanted). Copy strings from `strings-en.jsx` verbatim.

## Layout to keep (from page.js + ImtCalculator.js)

- Page header: badge pill ("Calculator {year}"), big title, description paragraph;
  disclaimer paragraph as page footer. Drop the breadcrumb nav.
- Main grid: form takes 2/3, results card 1/3 (stacks on mobile).
- Results card: sticky, dark blue (`bg-blue-900`), dl with IMT / Stamp Duty / Total
  (Total oversized), values suffixed `€`. When any breakdown row has
  `status.isNonResident`: the note box with the potential-refund amount and description.
- Full-width footer button toggling the details section (caret rotates 180°).
- Details section: per-buyer breakdown table **only when more than one buyer**; then the
  reference bracket table(s), with singular/plural section title.

## Interaction rules to keep (from ImtForm.js + ImtCalculator.js)

- Live recalculation on every change — there is no submit button.
- Initial state: price empty (treated as 0), mainland, hpp, no flags, one buyer with
  share 1 and all flags off.
- Purpose change side effects: leaving `hpp` clears every buyer's jovem flag; leaving
  housing (`hpp`/`secondary`) also clears non-resident flags.
- The two exemption toggles are mutually exclusive (turning one on turns the other off);
  post-rehab is disabled unless purpose is `hpp`.
- Buyers: "+ add" gives the new buyer the remaining share (rounded to 4 decimals,
  floored at 0); remove is only possible above one buyer, and dropping back to a single
  buyer resets their share to 1. The share % input only appears with 2+ buyers
  (displays `round(share*100)`, writes `value/100`).
- Per-buyer flags (jovem / offshore / non-resident) are mutually exclusive — enabling one
  clears the other two. Disable rules: jovem needs purpose `hpp`; non-resident needs a
  housing purpose; each is also disabled while another flag is on.
- Share-sum warning (amber box) when the shares don't total 100% (tolerance 0.001) —
  warning only, calculation still runs.
- Reference-table display rules: show the standard `tables[purpose]` table if some buyer
  actually falls back to it (not offshore, not non-resident-flat, not rehab-exempt, not
  jovem); show the jovem table (teal "secondary" header, label "… - IMT Jovem") when
  purpose is `hpp` and some non-offshore buyer has the jovem flag while no rehab
  exemption applies. Labels: "{Location} - {Purpose}".
- Reference-table rows (ImtReferenceTable.js): range text "Up to X€" / "From X€ to Y€" /
  "Over X€"; single flat-row tables show the price or "Valor de Aquisição"; highlight the
  active bracket for the current price; "Isento" badge on 0% rows; deduction column
  shows "—" when 0.

## Strip

- Next.js page machinery, SEO metadata, breadcrumb, locale routing.
- The i18n layer — hardcode the English strings.
- `trackEvent` analytics calls.
- `react-icons` — replace with text/inline SVG (caret `▾`, info `ⓘ`).
- The `Toggle`/`Tooltip` component abstractions — plain markup is fine; the original's
  CSS-only hover tooltip pattern copies over if wanted, or use `title=` attributes.
  Either way, keep the tooltips' legal text available somewhere visible.
- `animate-in fade-in slide-in-from-top-4` classes — a tailwindcss-animate plugin the
  Play CDN doesn't ship; drop or replace with a simple CSS transition.
- Do **not** copy the `sm_items-center` class in ImtForm.js line 284 — it's a typo for
  `sm:items-center` in the original.

## The structural twist: calculation moves server-side

The original imports the engine and computes in the browser (`useMemo`). In the port the
engine is Kotlin, so:

- Debounce input changes (~250 ms) and `POST /api/imt`; render from the response, whose
  shape mirrors `calculateImt`'s return (totals + breakdown with status flags and meta).
- The reference tables and their display rules need bracket data client-side: fetch
  `GET /api/tables/{year}/{location}` once per year/location change — enriched tables
  (`null` for the unbounded `upTo`) plus the year's `nonResidentRate` when present,
  which the display rules use.
- Match the original's tolerance for junk input: empty price is 0, invalid shares warn
  but still calculate; the server 400s only on structurally invalid requests.
