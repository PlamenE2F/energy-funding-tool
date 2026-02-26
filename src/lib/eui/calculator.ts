/**
 * EUI Calculation Engine
 *
 * Three calculation paths:
 *   Fast:     Electricity-only site EUI (R5/R1)
 *   Standard: Total site EUI (electricity + gas/fuel converted to kWh)
 *   Enhanced: Weather-normalized EUI (requires monthly data + HDD)
 *
 * Unit conventions:
 *   - Primary display: kWh/sqft/year (electric) or ekWh/sqft/year (total)
 *   - Internal storage: all energy in kWh, all areas in sqft
 *   - Gas conversion: 10.55 kWh/m³ (HHV) — NOT 10.36
 */

import type {
  EuiInput,
  EuiResult,
  CompletionPath,
} from "./types";
import { getFuelTypeConfig, convertFuelToKwh } from "@/lib/config/fuel-types";
import {
  SOURCE_SITE_RATIO_ELECTRICITY,
} from "@/lib/config/emissions";
import { runWeatherNormalization } from "./weather-normalization";

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Calculate EUI for a building assessment.
 * Automatically selects the best path based on available data.
 */
export function calculateEui(input: EuiInput): EuiResult {
  const path = determineCompletionPath(input);

  // Step 1: Electricity-only EUI (always calculated)
  const euiElectric = input.annualElectricityKwh / input.buildingSizeSqft;

  // Step 2: Gas/fuel energy equivalent
  const gasKwhEquivalent = calculateGasKwhEquivalent(input);

  // Step 3: Total site EUI (if fuel data available)
  const totalSiteEnergy =
    gasKwhEquivalent !== null
      ? input.annualElectricityKwh + gasKwhEquivalent
      : null;
  const euiTotal =
    totalSiteEnergy !== null
      ? totalSiteEnergy / input.buildingSizeSqft
      : null;

  // Step 4: Source EUI (stored, not displayed at Tier 2)
  const fuelSourceSiteRatio = getFuelSourceSiteRatio(input);
  const euiSourceElectric =
    (input.annualElectricityKwh * SOURCE_SITE_RATIO_ELECTRICITY) /
    input.buildingSizeSqft;
  const euiSourceTotal =
    gasKwhEquivalent !== null
      ? (input.annualElectricityKwh * SOURCE_SITE_RATIO_ELECTRICITY +
          gasKwhEquivalent * fuelSourceSiteRatio) /
        input.buildingSizeSqft
      : null;

  // Step 5: Weather normalization (enhanced path only)
  let euiWeatherNormalized: number | null = null;
  if (path === "enhanced") {
    const normResult = runWeatherNormalization(input);
    if (normResult !== null) {
      euiWeatherNormalized = normResult.predictedAnnual / input.buildingSizeSqft;
    }
  }

  return {
    completionPath: path,
    euiElectric: round(euiElectric, 1),
    euiTotal: euiTotal !== null ? round(euiTotal, 1) : null,
    euiWeatherNormalized:
      euiWeatherNormalized !== null ? round(euiWeatherNormalized, 1) : null,
    euiSourceElectric: round(euiSourceElectric, 1),
    euiSourceTotal: euiSourceTotal !== null ? round(euiSourceTotal, 1) : null,
    gasKwhEquivalent:
      gasKwhEquivalent !== null ? round(gasKwhEquivalent, 0) : null,
  };
}

// ---------------------------------------------------------------------------
// Path Determination
// ---------------------------------------------------------------------------

/**
 * Determine which calculation path to use based on available data.
 */
export function determineCompletionPath(input: EuiInput): CompletionPath {
  // Enhanced: requires monthly electricity data + HDD + TMY
  if (
    input.monthlyElectricityKwh &&
    input.monthlyElectricityKwh.length >= 9 &&
    input.monthlyHdd &&
    input.monthlyHdd.length >= 9 &&
    input.tmyAnnualHdd
  ) {
    // Additional validation: must span heating season
    if (hasHeatingSeasonData(input.monthlyHdd)) {
      return "enhanced";
    }
  }

  // Standard: has gas or fuel data
  if (input.annualGasM3 !== null || input.fuelVolume !== null) {
    return "standard";
  }

  // Fast: electricity only
  return "fast";
}

// ---------------------------------------------------------------------------
// Gas/Fuel Conversion
// ---------------------------------------------------------------------------

/**
 * Convert gas/fuel consumption to kWh equivalent.
 * Returns null if no fuel data provided.
 */
export function calculateGasKwhEquivalent(input: EuiInput): number | null {
  // Natural gas path (most common)
  if (input.annualGasM3 !== null && input.annualGasM3 > 0) {
    return convertFuelToKwh("natural_gas", input.annualGasM3);
  }

  // Alternative fuel path (oil, propane)
  if (
    input.primaryFuelType !== null &&
    input.fuelVolume !== null &&
    input.fuelVolume > 0
  ) {
    return convertFuelToKwh(input.primaryFuelType, input.fuelVolume);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Source-Site Ratio
// ---------------------------------------------------------------------------

function getFuelSourceSiteRatio(input: EuiInput): number {
  if (input.primaryFuelType) {
    const config = getFuelTypeConfig(input.primaryFuelType);
    return config.sourceSiteRatio;
  }
  // Default: natural gas
  return getFuelTypeConfig("natural_gas").sourceSiteRatio;
}

// ---------------------------------------------------------------------------
// Heating Season Validation (for Enhanced path)
// ---------------------------------------------------------------------------

/**
 * Check that monthly HDD data spans at least one heating season.
 * Requirement: at least 3 months with HDD > 100 AND at least 2 non-heating months.
 */
function hasHeatingSeasonData(monthlyHdd: number[]): boolean {
  const heatingMonths = monthlyHdd.filter((hdd) => hdd > 100).length;
  const nonHeatingMonths = monthlyHdd.filter((hdd) => hdd <= 100).length;
  return heatingMonths >= 3 && nonHeatingMonths >= 2;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
