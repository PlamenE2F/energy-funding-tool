/**
 * Emissions Configuration — Ontario
 *
 * Grid electricity emission factors and fuel switching defaults.
 * All factors from ECCC V3.0, October 2025.
 */

// ---------------------------------------------------------------------------
// Scope 2 — Grid Electricity
// ---------------------------------------------------------------------------

/** Ontario grid average emission factor (gCO₂eq/kWh) — ECCC V3.0 Table 5.3 */
export const SCOPE2_AVERAGE_FACTOR = 59;

/** Year this factor is designated for */
export const SCOPE2_AVERAGE_FACTOR_YEAR = 2026;

/** Source reference */
export const SCOPE2_SOURCE = "ECCC V3.0, Table 5.3 (designated for 2026)";

// ---------------------------------------------------------------------------
// Source-Site Ratios (for ENERGY STAR compatibility)
// ---------------------------------------------------------------------------

export const SOURCE_SITE_RATIO_ELECTRICITY = 2.05;
export const SOURCE_SITE_RATIO_NATURAL_GAS = 1.02;
export const SOURCE_SITE_RATIO_FUEL_OIL = 1.01;
export const SOURCE_SITE_RATIO_PROPANE = 1.01;

// ---------------------------------------------------------------------------
// Fuel Switching Defaults (Tier 2)
// ---------------------------------------------------------------------------

/** Existing gas furnace/boiler efficiency (conservative) */
export const DEFAULT_FURNACE_EFFICIENCY = 0.80;

/** Heat pump COP (conservative cold-climate commercial) */
export const DEFAULT_HEAT_PUMP_COP = 3.0;

// ---------------------------------------------------------------------------
// Benchmark Cost Rates (for deriving cost intensity benchmarks)
// ---------------------------------------------------------------------------

/** Ontario average blended commercial electricity rate ($/kWh) */
export const BENCHMARK_COST_RATE_ELECTRIC = 0.13;

/** Ontario typical commercial natural gas rate ($/m³) — Enbridge Gas */
export const BENCHMARK_COST_RATE_GAS = 0.35;

// ---------------------------------------------------------------------------
// Carbon Pricing (structural only — NOT populated for Ontario)
// ---------------------------------------------------------------------------

/** Null for Ontario. Ready for BC, QC, international jurisdictions. */
export const CARBON_PRICE_PER_TONNE: number | null = null;
export const CARBON_PRICE_EFFECTIVE_DATE: string | null = null;
export const CARBON_PRICE_SOURCE: string | null = null;
