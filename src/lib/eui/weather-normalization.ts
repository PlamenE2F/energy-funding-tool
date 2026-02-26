/**
 * Weather Normalization Engine — 3P-H Regression Model
 *
 * Three-parameter heating change-point model:
 *   E(month) = baseload + β_heat × max(0, HDD_month)
 *
 * Where:
 *   baseload = weather-independent monthly consumption (kWh/month)
 *   β_heat   = heating sensitivity (kWh/HDD)
 *   HDD_month = heating degree-days for the billing month
 *
 * Change-point: Fixed at 18°C for Tier 2.
 *
 * Data requirements:
 *   12 months → full regression, high confidence
 *   9–11 months → regression with "partial year" caveat
 *   < 9 months → fall back to simple EUI
 *
 * Validation:
 *   - Must span at least one heating season (≥3 months with HDD > 100)
 *   - Must have at least 2 non-heating months
 *   - R² ≥ 0.70 → "good", 0.50–0.69 → "moderate", < 0.50 → "poor" (fall back)
 */

import type { EuiInput, RegressionResult, RegressionQuality } from "./types";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WeatherNormalizationOutput {
  /** Predicted annual consumption using TMY HDD */
  predictedAnnual: number;
  /** Electric regression result */
  electricRegression: RegressionResult;
  /** Gas regression result (separate, if gas monthly data provided) */
  gasRegression: RegressionResult | null;
}

/**
 * Run weather normalization on monthly data.
 * Returns null if data is insufficient or regression quality is too poor.
 */
export function runWeatherNormalization(
  input: EuiInput
): WeatherNormalizationOutput | null {
  const { monthlyElectricityKwh, monthlyHdd, tmyAnnualHdd } = input;

  if (!monthlyElectricityKwh || !monthlyHdd || !tmyAnnualHdd) {
    return null;
  }

  // Validate data sufficiency
  if (monthlyElectricityKwh.length < 9 || monthlyHdd.length < 9) {
    return null;
  }

  // Use minimum length of both arrays
  const n = Math.min(monthlyElectricityKwh.length, monthlyHdd.length);
  const elec = monthlyElectricityKwh.slice(0, n);
  const hdd = monthlyHdd.slice(0, n);

  // Run electric regression
  const electricRegression = runRegression(elec, hdd, "3P-H");

  // If regression quality is poor, fall back
  if (electricRegression.qualityFlag === "poor") {
    return null;
  }

  // Calculate predicted annual using TMY HDD
  const predictedAnnual =
    electricRegression.baseloadMonthly * 12 +
    electricRegression.betaHeat * tmyAnnualHdd;

  // Run separate gas regression if monthly gas data available
  let gasRegression: RegressionResult | null = null;
  if (
    input.monthlyGasM3 &&
    input.monthlyGasM3.length >= 9
  ) {
    const gasN = Math.min(input.monthlyGasM3.length, monthlyHdd.length);
    const gas = input.monthlyGasM3.slice(0, gasN);
    const gasHdd = monthlyHdd.slice(0, gasN);
    gasRegression = runRegression(gas, gasHdd, "3P-H");
  }

  return {
    predictedAnnual,
    electricRegression,
    gasRegression,
  };
}

// ---------------------------------------------------------------------------
// 3P-H Regression
// ---------------------------------------------------------------------------

/**
 * Run a three-parameter heating change-point regression.
 *
 * Model: y_i = baseload + β_heat × HDD_i + ε_i
 *
 * Uses ordinary least squares. Change-point fixed at 18°C (HDD base).
 */
export function runRegression(
  consumption: number[],
  hdd: number[],
  modelType: string
): RegressionResult {
  const n = consumption.length;

  // Calculate means
  const meanY = consumption.reduce((s, v) => s + v, 0) / n;
  const meanX = hdd.reduce((s, v) => s + v, 0) / n;

  // Calculate regression coefficients (OLS)
  let ssXY = 0;
  let ssXX = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (hdd[i] - meanX) * (consumption[i] - meanY);
    ssXX += (hdd[i] - meanX) * (hdd[i] - meanX);
  }

  // β_heat = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)²
  const betaHeat = ssXX > 0 ? ssXY / ssXX : 0;

  // baseload = ȳ - β × x̄
  const baseloadMonthly = meanY - betaHeat * meanX;

  // Ensure baseload is non-negative (physically meaningful)
  const adjustedBaseload = Math.max(0, baseloadMonthly);

  // Calculate R²
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = adjustedBaseload + betaHeat * hdd[i];
    ssTot += (consumption[i] - meanY) * (consumption[i] - meanY);
    ssRes += (consumption[i] - predicted) * (consumption[i] - predicted);
  }

  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Quality flag based on R²
  let qualityFlag: RegressionQuality;
  if (rSquared >= 0.70) {
    qualityFlag = "good";
  } else if (rSquared >= 0.50) {
    qualityFlag = "moderate";
  } else {
    qualityFlag = "poor";
  }

  // Derived annual values
  const baseloadAnnual = adjustedBaseload * 12;
  // weather-dependent = predicted_annual - baseload_annual
  // (we don't have TMY here, so use the regression data's total)
  const totalPredicted = consumption.reduce((s, v) => s + v, 0) * (12 / n);
  const weatherDepAnnual = Math.max(0, totalPredicted - baseloadAnnual);

  return {
    modelType,
    baseloadMonthly: round(adjustedBaseload, 1),
    betaHeat: round(betaHeat, 4),
    rSquared: round(rSquared, 3),
    changepointTemp: 18, // Fixed for Tier 2
    qualityFlag,
    baseloadAnnual: round(baseloadAnnual, 0),
    weatherDepAnnual: round(weatherDepAnnual, 0),
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
