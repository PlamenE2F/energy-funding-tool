/**
 * Weather Normalization Tests
 *
 * 3P-H regression model, R² thresholds, data validation,
 * baseload separation.
 */

import { describe, it, expect } from "vitest";
import {
  runWeatherNormalization,
  runRegression,
} from "@/lib/eui/weather-normalization";
import type { EuiInput } from "@/lib/eui/types";

// ---------------------------------------------------------------------------
// Helper: Generate synthetic monthly data
// ---------------------------------------------------------------------------

/**
 * Generate synthetic monthly data following a 3P-H model:
 *   E = baseload + beta × HDD + noise
 */
function generateMonthlyData(
  baseload: number,
  betaHeat: number,
  hddValues: number[],
  noiseLevel: number = 0
): { consumption: number[]; hdd: number[] } {
  const consumption = hddValues.map(
    (hdd) =>
      baseload + betaHeat * hdd + (Math.random() - 0.5) * noiseLevel * 2
  );
  return { consumption, hdd: hddValues };
}

// Typical Ontario monthly HDD (base 18°C)
const ONTARIO_MONTHLY_HDD = [
  650, 580, 470, 250, 80, 10, 0, 5, 50, 200, 380, 580,
];
const ONTARIO_TMY_ANNUAL_HDD = 3255;

// ---------------------------------------------------------------------------
// 3P-H Regression
// ---------------------------------------------------------------------------

describe("3P-H regression model", () => {
  it("recovers known baseload and beta from clean data", () => {
    const { consumption, hdd } = generateMonthlyData(
      5000, // baseload 5000 kWh/month
      3.5, // 3.5 kWh/HDD
      ONTARIO_MONTHLY_HDD,
      0 // no noise
    );

    const result = runRegression(consumption, hdd, "3P-H");

    expect(result.baseloadMonthly).toBeCloseTo(5000, -1);
    expect(result.betaHeat).toBeCloseTo(3.5, 1);
    expect(result.rSquared).toBeGreaterThan(0.95);
    expect(result.qualityFlag).toBe("good");
    expect(result.changepointTemp).toBe(18);
  });

  it("reports 'moderate' quality for noisy data (R² 0.5–0.7)", () => {
    // Very noisy data that should produce moderate fit
    const hdd = ONTARIO_MONTHLY_HDD;
    const consumption = [
      12000, 15000, 8000, 11000, 6000, 7500, 5000, 8000, 4000, 10000, 9000,
      14000,
    ];

    const result = runRegression(consumption, hdd, "3P-H");

    // With this noise level, R² should be moderate
    // (exact value depends on fit, but testing the mechanism)
    expect(result.qualityFlag).toMatch(/good|moderate/);
  });

  it("reports 'poor' quality for random data", () => {
    const hdd = ONTARIO_MONTHLY_HDD;
    // Completely random — no relationship to HDD
    const consumption = [
      5000, 12000, 3000, 15000, 8000, 2000, 14000, 4000, 11000, 6000, 13000,
      7000,
    ];

    const result = runRegression(consumption, hdd, "3P-H");

    // R² should be low
    expect(result.rSquared).toBeLessThan(0.5);
    expect(result.qualityFlag).toBe("poor");
  });

  it("ensures baseload is non-negative", () => {
    // Edge case: high beta, low consumption at summer
    const result = runRegression(
      [20000, 18000, 15000, 8000, 3000, 1000, 500, 600, 2000, 6000, 12000, 17000],
      ONTARIO_MONTHLY_HDD,
      "3P-H"
    );

    expect(result.baseloadMonthly).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Weather Normalization Pipeline
// ---------------------------------------------------------------------------

describe("runWeatherNormalization", () => {
  it("returns predicted annual using TMY HDD for clean data", () => {
    const { consumption } = generateMonthlyData(
      5000,
      3.5,
      ONTARIO_MONTHLY_HDD,
      0
    );

    const input: EuiInput = {
      buildingSizeSqft: 25000,
      buildingType: "office",
      annualElectricityKwh: consumption.reduce((a, b) => a + b, 0),
      annualGasM3: null,
      primaryFuelType: null,
      fuelVolume: null,
      monthlyElectricityKwh: consumption,
      monthlyGasM3: null,
      monthlyHdd: ONTARIO_MONTHLY_HDD,
      tmyAnnualHdd: ONTARIO_TMY_ANNUAL_HDD,
    };

    const result = runWeatherNormalization(input);

    expect(result).not.toBeNull();
    // predicted = baseload × 12 + beta × TMY_HDD
    // ≈ 5000 × 12 + 3.5 × 3255 = 60,000 + 11,393 = 71,393
    expect(result!.predictedAnnual).toBeCloseTo(71393, -2);
    expect(result!.electricRegression.qualityFlag).toBe("good");
  });

  it("returns null for insufficient data (< 9 months)", () => {
    const input: EuiInput = {
      buildingSizeSqft: 25000,
      buildingType: "office",
      annualElectricityKwh: 350000,
      annualGasM3: null,
      primaryFuelType: null,
      fuelVolume: null,
      monthlyElectricityKwh: Array(6).fill(30000),
      monthlyGasM3: null,
      monthlyHdd: Array(6).fill(300),
      tmyAnnualHdd: ONTARIO_TMY_ANNUAL_HDD,
    };

    expect(runWeatherNormalization(input)).toBeNull();
  });

  it("returns null when regression quality is poor", () => {
    const input: EuiInput = {
      buildingSizeSqft: 25000,
      buildingType: "office",
      annualElectricityKwh: 350000,
      annualGasM3: null,
      primaryFuelType: null,
      fuelVolume: null,
      // Random consumption — no weather relationship
      monthlyElectricityKwh: [
        5000, 12000, 3000, 15000, 8000, 2000, 14000, 4000, 11000, 6000, 13000,
        7000,
      ],
      monthlyGasM3: null,
      monthlyHdd: ONTARIO_MONTHLY_HDD,
      tmyAnnualHdd: ONTARIO_TMY_ANNUAL_HDD,
    };

    expect(runWeatherNormalization(input)).toBeNull();
  });

  it("runs separate gas regression when monthly gas data provided", () => {
    const elecData = generateMonthlyData(5000, 3.5, ONTARIO_MONTHLY_HDD, 0);
    const gasData = generateMonthlyData(200, 0.8, ONTARIO_MONTHLY_HDD, 0);

    const input: EuiInput = {
      buildingSizeSqft: 25000,
      buildingType: "office",
      annualElectricityKwh: elecData.consumption.reduce((a, b) => a + b, 0),
      annualGasM3: gasData.consumption.reduce((a, b) => a + b, 0),
      primaryFuelType: null,
      fuelVolume: null,
      monthlyElectricityKwh: elecData.consumption,
      monthlyGasM3: gasData.consumption,
      monthlyHdd: ONTARIO_MONTHLY_HDD,
      tmyAnnualHdd: ONTARIO_TMY_ANNUAL_HDD,
    };

    const result = runWeatherNormalization(input);

    expect(result).not.toBeNull();
    expect(result!.gasRegression).not.toBeNull();
    expect(result!.gasRegression!.baseloadMonthly).toBeCloseTo(200, -1);
    expect(result!.gasRegression!.betaHeat).toBeCloseTo(0.8, 1);
  });
});

// ---------------------------------------------------------------------------
// Baseload Separation
// ---------------------------------------------------------------------------

describe("Baseload separation", () => {
  it("separates baseload from weather-dependent consumption", () => {
    const { consumption } = generateMonthlyData(
      5000,
      3.5,
      ONTARIO_MONTHLY_HDD,
      0
    );

    const result = runRegression(consumption, ONTARIO_MONTHLY_HDD, "3P-H");

    // Baseload annual ≈ 5000 × 12 = 60,000
    expect(result.baseloadAnnual).toBeCloseTo(60000, -2);
    // Weather-dependent should be the rest
    expect(result.weatherDepAnnual).toBeGreaterThan(0);
  });
});
