package imt

/**
 * One IMT bracket. Progressive brackets tax the slice up to [upTo]; flat brackets
 * ([isFlat]) tax the entire value at [rate] once the total price falls in them.
 * [upTo] is [Double.POSITIVE_INFINITY] for unbounded brackets — the null-for-Infinity
 * convention exists only at JSON boundaries, never here.
 *
 * [deduction] is the "parcela a abater" filled in by [enrichTable]; raw brackets
 * carry 0.0.
 */
data class Bracket(
    val upTo: Double,
    val rate: Double,
    val isFlat: Boolean = false,
    val deduction: Double = 0.0,
)

/** Property purpose as declared in the deed. The jovem table is not a purpose. */
enum class Purpose(val key: String) {
    HPP("hpp"),
    SECONDARY("secondary"),
    RUSTIC("rustic"),
    OTHER("other"),
}

enum class Location {
    MAINLAND,
    ISLANDS,
}

/** Table key for the jovem regime (CIMT Art. 17.º-A), alongside the [Purpose] keys. */
const val JOVEM_TABLE = "jovem"

/**
 * One year's dataset for a region: bracket tables per purpose (plus jovem), the
 * stamp-duty rate, the jovem stamp-duty exemption threshold (JS:
 * `youngunStampDutyExemptionThreshold`; this port uses the legal term jovem), and,
 * for years where CIMT Art. 17.º n.º 10 is in force, the non-resident flat rate
 * (null otherwise — absence means "rule does not apply for this year").
 */
data class RegionData(
    val tables: Map<String, List<Bracket>>,
    val stampDutyRate: Double,
    val jovemStampDutyExemptionThreshold: Double,
    val nonResidentRate: Double? = null,
)

private fun bracket(upTo: Double, rate: Double) = Bracket(upTo = upTo, rate = rate)

private fun flat(upTo: Double, rate: Double) = Bracket(upTo = upTo, rate = rate, isFlat = true)

private const val INF = Double.POSITIVE_INFINITY

/**
 * Raw per-year bracket data, transcribed verbatim from the oracle's `constants.js`
 * (which encodes the CIMT Art. 17.º tables per fiscal year).
 */
val RAW_IMT_DATA: Map<Int, RegionData> = mapOf(
    2024 to RegionData(
        tables = mapOf(
            "hpp" to listOf(
                bracket(101917.0, 0.0),
                bracket(139412.0, 0.02),
                bracket(190086.0, 0.05),
                bracket(316772.0, 0.07),
                bracket(633453.0, 0.08),
                flat(1102920.0, 0.06),
                flat(INF, 0.075),
            ),
            "secondary" to listOf(
                bracket(101917.0, 0.01),
                bracket(139412.0, 0.02),
                bracket(190086.0, 0.05),
                bracket(316772.0, 0.07),
                bracket(607528.0, 0.08),
                flat(1102920.0, 0.06),
                flat(INF, 0.075),
            ),
            JOVEM_TABLE to listOf(
                bracket(316772.0, 0.0),
                bracket(633453.0, 0.08),
                flat(1102920.0, 0.06),
                flat(INF, 0.075),
            ),
            "rustic" to listOf(flat(INF, 0.05)),
            "other" to listOf(flat(INF, 0.065)),
        ),
        stampDutyRate = 0.008,
        jovemStampDutyExemptionThreshold = 316772.0,
    ),
    2025 to RegionData(
        tables = mapOf(
            "hpp" to listOf(
                bracket(104261.0, 0.0),
                bracket(142618.0, 0.02),
                bracket(194458.0, 0.05),
                bracket(324058.0, 0.07),
                bracket(648022.0, 0.08),
                flat(1128287.0, 0.06),
                flat(INF, 0.075),
            ),
            "secondary" to listOf(
                bracket(104261.0, 0.01),
                bracket(142618.0, 0.02),
                bracket(194458.0, 0.05),
                bracket(324058.0, 0.07),
                bracket(648022.0, 0.08),
                flat(1128287.0, 0.06),
                flat(INF, 0.075),
            ),
            JOVEM_TABLE to listOf(
                bracket(324058.0, 0.0),
                bracket(648022.0, 0.08),
                flat(1128287.0, 0.06),
                flat(INF, 0.075),
            ),
            "rustic" to listOf(flat(INF, 0.05)),
            "other" to listOf(flat(INF, 0.065)),
        ),
        stampDutyRate = 0.008,
        jovemStampDutyExemptionThreshold = 324058.0,
    ),
    2026 to RegionData(
        tables = mapOf(
            "hpp" to listOf(
                bracket(106346.0, 0.0),
                bracket(145470.0, 0.02),
                bracket(198347.0, 0.05),
                bracket(330539.0, 0.07),
                bracket(660982.0, 0.08),
                flat(1150853.0, 0.06),
                flat(INF, 0.075),
            ),
            "secondary" to listOf(
                bracket(106346.0, 0.01),
                bracket(145470.0, 0.02),
                bracket(198347.0, 0.05),
                bracket(330539.0, 0.07),
                bracket(633931.0, 0.08),
                flat(1150853.0, 0.06),
                flat(INF, 0.075),
            ),
            JOVEM_TABLE to listOf(
                bracket(330539.0, 0.0),
                bracket(660982.0, 0.08),
                flat(1150853.0, 0.06),
                flat(INF, 0.075),
            ),
            "rustic" to listOf(flat(INF, 0.05)),
            "other" to listOf(flat(INF, 0.065)),
        ),
        stampDutyRate = 0.008,
        jovemStampDutyExemptionThreshold = 330539.0,
        // CIMT Art. 17.º n.º 10 (added by Decreto-Lei n.º 97/2026, de 20 de maio):
        // flat rate on the full value for non-resident buyers of urban housing.
        // Only present for years in which the rule is in force — the engine treats
        // its absence as "rule does not apply for this year".
        nonResidentRate = 0.075,
    ),
)

/**
 * Transforms a raw IMT bracket table into an "enriched" version by calculating the
 * static deduction ("parcela a abater") for each progressive tier. The deduction
 * allows the simplified formula: (Total Value × Marginal Rate) − Deduction.
 *
 * The arithmetic mirrors the oracle's `enrichTable` operation for operation —
 * do not refactor the expressions (see CLAUDE.md on float parity).
 */
fun enrichTable(table: List<Bracket>): List<Bracket> {
    var accumulatedTax = 0.0
    var previousLimit = 0.0

    return table.map { bracket ->
        val range = bracket.upTo - previousLimit
        val deduction =
            if (bracket.upTo == INF || bracket.isFlat) 0.0
            else roundCurrency(bracket.upTo * bracket.rate - (accumulatedTax + range * bracket.rate))

        val enriched = bracket.copy(deduction = deduction)

        if (bracket.upTo != INF && !bracket.isFlat) {
            accumulatedTax += range * bracket.rate
            previousLimit = bracket.upTo
        }

        enriched
    }
}

/**
 * Islands (Açores/Madeira) bracket scaling: ×1.25 on every bound, rounded to whole
 * euros with JS `Math.round` semantics. Applied to hpp/secondary/jovem only —
 * rustic and other keep mainland values.
 */
private fun scaleTableForIslands(table: List<Bracket>): List<Bracket> =
    table.map { bracket ->
        bracket.copy(upTo = if (bracket.upTo == INF) INF else jsMathRound(bracket.upTo * 1.25))
    }

private val SCALED_TABLE_KEYS = setOf("hpp", "secondary", JOVEM_TABLE)

/**
 * The effective dataset: per year and region, enriched tables (islands pre-scaled,
 * including the ×1.25 jovem stamp-duty threshold). Mirrors `imtData` in the
 * oracle's `tax_utils.js`.
 */
val imtData: Map<Int, Map<Location, RegionData>> = RAW_IMT_DATA.mapValues { (_, data) ->
    val mainland = data.copy(
        tables = data.tables.mapValues { (_, table) -> enrichTable(table) },
    )

    val islands = data.copy(
        tables = data.tables.mapValues { (key, table) ->
            enrichTable(if (key in SCALED_TABLE_KEYS) scaleTableForIslands(table) else table)
        },
        jovemStampDutyExemptionThreshold = jsMathRound(data.jovemStampDutyExemptionThreshold * 1.25),
    )

    mapOf(Location.MAINLAND to mainland, Location.ISLANDS to islands)
}
