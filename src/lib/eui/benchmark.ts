/**
 * Benchmark Comparison Framework
 *
 * Compares a building's EUI against the Canadian median for its type.
 *
 * Display logic:
 *   GREEN (9 types): Show comparison + cost intensity
 *   YELLOW (3 types): Show comparison + caveat, no cost intensity
 *   RED (4 types): Suppress comparison entirely
 *
 * Electricity-only vs. total-site:
 *   Fast path: compare against benchmark_eui × electricity_fraction
 *   Standard/Enhanced: compare against total benchmark — apples-to-apples
 */

import type {
  BenchmarkResult,
  BenchmarkTier,
  CompletionPath,
} from "./types";
import { getBuildingTypeConfig } from "@/lib/config/building-types";
import {
  BENCHMARK_COST_RATE_ELECTRIC,
  BENCHMARK_COST_RATE_GAS,
} from "@/lib/config/emissions";

// Threshold for "near median" — within ±15%
const NEAR_MEDIAN_THRESHOLD = 0.15;

// Cost intensity range — ±20% around derived value
const COST_INTENSITY_RANGE = 0.20;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare building's EUI against benchmark for its type.
 *
 * @param buildingTypeId - One of the 16 canonical building types
 * @param userEui - The user's calculated EUI (kWh/sqft/year)
 * @param completionPath - Which data path was used
 * @param effectiveRate - From rate framework, for cost intensity ($/kWh)
 */
export function compareToBenchmark(
  buildingTypeId: string,
  userEui: number,
  completionPath: CompletionPath,
  effectiveRate: number
): BenchmarkResult {
  const config = getBuildingTypeConfig(buildingTypeId);

  // RED types: no benchmark comparison
  if (config.benchmarkClassification === "red") {
    return {
      comparisonShown: false,
      classification: "red",
      benchmarkEui: null,
      userVsMedianPct: null,
      benchmarkTier: null,
      caveatText: null,
      costIntensityLow: null,
      costIntensityHigh: null,
      comparisonNote:
        "Benchmark comparison is not available for this building type. Your energy data is still used for measure recommendations and emissions calculations.",
    };
  }

  // No benchmark EUI available (shouldn't happen for GREEN/YELLOW, but guard)
  if (config.benchmarkEuiKwhSqft === null) {
    return {
      comparisonShown: false,
      classification: config.benchmarkClassification,
      benchmarkEui: null,
      userVsMedianPct: null,
      benchmarkTier: null,
      caveatText: null,
      costIntensityLow: null,
      costIntensityHigh: null,
      comparisonNote: null,
    };
  }

  // Determine the benchmark EUI to compare against
  let benchmarkEui: number;
  let comparisonNote: string | null = null;

  if (completionPath === "fast") {
    // Electricity-only: compare against estimated electricity portion
    benchmarkEui = config.benchmarkEuiKwhSqft * config.electricityFraction;
    comparisonNote =
      "This comparison estimates the electricity portion of total building energy. Adding gas data would enable a more precise comparison.";
  } else {
    // Standard or Enhanced: total site comparison
    benchmarkEui = config.benchmarkEuiKwhSqft;
  }

  // Calculate comparison percentage: (user - median) / median × 100
  const userVsMedianPct =
    Math.round(((userEui - benchmarkEui) / benchmarkEui) * 1000) / 10;

  // Three-tier indicator
  const benchmarkTier = determineBenchmarkTier(userVsMedianPct);

  // Cost intensity (GREEN types only)
  let costIntensityLow: number | null = null;
  let costIntensityHigh: number | null = null;

  if (config.benchmarkClassification === "green") {
    const benchmarkCostIntensity = deriveCostIntensity(
      config.benchmarkEuiKwhSqft,
      config.electricityFraction
    );
    costIntensityLow = round(benchmarkCostIntensity * (1 - COST_INTENSITY_RANGE), 2);
    costIntensityHigh = round(benchmarkCostIntensity * (1 + COST_INTENSITY_RANGE), 2);
  }

  return {
    comparisonShown: true,
    classification: config.benchmarkClassification,
    benchmarkEui: round(benchmarkEui, 1),
    userVsMedianPct,
    benchmarkTier,
    caveatText: config.benchmarkCaveatText,
    costIntensityLow,
    costIntensityHigh,
    comparisonNote,
  };
}

// ---------------------------------------------------------------------------
// Benchmark Tier
// ---------------------------------------------------------------------------

/**
 * Determine three-tier benchmark indicator.
 *   Below median: user EUI < median by more than 15%
 *   Near median: within ±15% of median
 *   Above median: user EUI > median by more than 15%
 */
function determineBenchmarkTier(userVsMedianPct: number): BenchmarkTier {
  if (userVsMedianPct < -NEAR_MEDIAN_THRESHOLD * 100) {
    return "below_median";
  }
  if (userVsMedianPct > NEAR_MEDIAN_THRESHOLD * 100) {
    return "above_median";
  }
  return "near_median";
}

// ---------------------------------------------------------------------------
// Cost Intensity
// ---------------------------------------------------------------------------

/**
 * Derive cost intensity from EUI benchmark × current average rates.
 * DO NOT use stale SCIEU 2019 cost data.
 *
 * Cost = (EUI × elec_fraction × elec_rate) +
 *        (EUI × (1 - elec_fraction) × gas_rate_per_kwh)
 *
 * Gas rate per kWh = gas_rate_per_m3 / gas_kwh_per_m3
 */
function deriveCostIntensity(
  benchmarkEuiKwhSqft: number,
  electricityFraction: number
): number {
  const gasRatePerKwh = BENCHMARK_COST_RATE_GAS / 10.55; // $/m³ ÷ kWh/m³
  const elecPortion =
    benchmarkEuiKwhSqft * electricityFraction * BENCHMARK_COST_RATE_ELECTRIC;
  const gasPortion =
    benchmarkEuiKwhSqft * (1 - electricityFraction) * gasRatePerKwh;
  return elecPortion + gasPortion;
}

// ---------------------------------------------------------------------------
// Display Helpers
// ---------------------------------------------------------------------------

/**
 * Get user-facing comparison text.
 */
export function getBenchmarkComparisonText(
  userVsMedianPct: number,
  benchmarkTier: BenchmarkTier
): string {
  const absPct = Math.abs(userVsMedianPct);
  const direction = userVsMedianPct > 0 ? "more" : "less";

  if (benchmarkTier === "near_median") {
    return `Your building uses approximately the same energy as the median for comparable buildings (${absPct.toFixed(0)}% ${direction}).`;
  }

  return `Your building uses ${absPct.toFixed(0)}% ${direction} energy than the median for comparable buildings.`;
}

/**
 * Get cost intensity display text for GREEN types.
 */
export function getCostIntensityText(
  low: number,
  high: number
): string {
  return `Comparable buildings in Ontario typically spend $${low.toFixed(2)}–$${high.toFixed(2)}/sqft/year on energy`;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
