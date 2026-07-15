Save this prompt verbatim to prompts/01-golden-master.md and commit it before doing
anything else. Read CLAUDE.md and the latest DEVLOG.md entry.

oracle/ contains the reference JS implementation (my own code from another project,
vendored read-only per CLAUDE.md): imt.js, tax_calculator.js, tax_utils.js, constants.js,
plus their original test files for reference.

Write oracle/generate-golden.mjs: a Node script (no dependencies) that runs calculateImt
over a systematic case matrix and writes oracle/golden.json. Matrix: every year in the
data × {mainland, islands} × {hpp, secondary, rustic, other} × buyer configurations
(single standard; single jovem-eligible; single offshore; single non-resident; two buyers
with shares 0.7/0.3 mixing flags; jovem+non-resident; offshore+non-resident) ×
{no flags, isInUrbanRehabArea, postRehabFirstTransfer} × price points (each progressive
bracket boundary and boundary+0.01 for that year/location, one mid-bracket point per
bracket, one point in each flat tier, 0, and 1). Deduplicate; report the case count.

JSON has no Infinity: represent unbounded values as null in golden.json and note the
convention in a comment at the top of the generator. Each case records the full input and
the full output (totals + breakdown). Commit the generator and golden.json, update
DEVLOG.md.
