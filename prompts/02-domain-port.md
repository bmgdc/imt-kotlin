Save this prompt verbatim to prompts/02-domain-port.md and commit it before doing
anything else. Read CLAUDE.md, the latest DEVLOG.md entry, and all four JS source files
in oracle/.

Port the domain to Kotlin under src/main/kotlin/imt/, following CLAUDE.md's architecture
and its non-negotiable conventions (Double arithmetic in the same operation order,
roundToLong-based rounding, POSITIVE_INFINITY internally, jovem naming, KDoc carrying
over the CIMT legal citations).

Order of work: Rounding.kt, then Tables.kt (raw data, enrichment, islands scaling), then
TaxCalculator.kt, then ImtEngine.kt. After each file, port the corresponding unit tests
from oracle/'s original test files and make them pass before moving on. Do not wire the
golden parity suite yet — that's the next session. Commit per component, update DEVLOG.md.
