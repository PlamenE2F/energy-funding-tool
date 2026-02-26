/**
 * Integration Tests — Full Rate Classification Pipeline
 *
 * Tests the complete flow from AssessmentInput through classification,
 * effective rate calculation, and measure card savings output.
 *
 * Covers Section 9.1 (classification accuracy), Section 9.2 (rate validation),
 * and Section 9.3 (measure card output format).
 */

import { describe, it, expect } from "vitest";
import {
  classifyAndCalculateRate,
  calculateMeasureSavings,
  calculateTenYearProjections,
  formatDollars,
  formatKwh,
} from "@/lib/rates";
import type { AssessmentInput, MeasureType } from "@/lib/rates";
import { isClassAEligible } from "@/lib/rates/classification";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<AssessmentInput> = {}): AssessmentInput {
  return {
    buildingSizeSqft: 10000,
    buildingType: "office",
    operatingHours: 3000,
    annualElectricityKwh: 200000,
    annualElectricityCost: 26000,
    peakDemandKw: null,
    rateStructure: null,
    postalCode: "M5V 3L9",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Full Pipeline — Section 9.1 Test Buildings
// ---------------------------------------------------------------------------

describe("classifyAndCalculateRate — full pipeline", () => {
  it("Small retail (2,000 sqft, 30k kWh, $5,100) → RPP, rate in range", () => {
    const input = makeInput({
      buildingSizeSqft: 2000,
      buildingType: "retail",
      annualElectricityKwh: 30000,
      annualElectricityCost: 5100,
      operatingHours: 3500,
    });

    const result = classifyAndCalculateRate(input);

    expect(result.rateClass).toMatch(/^rpp/);
    expect(result.effectiveRateTotal).toBeCloseTo(0.17, 2);
    expect(result.effectiveRateEnergy).toBeCloseTo(0.17, 2);
    expect(result.demandChargeApplicable).toBe(false);
    expect(result.demandChargeRate).toBeNull();
  });

  it("Mid-size office (25k sqft, 350k kWh, $45,500) → Class B", () => {
    const input = makeInput({
      buildingSizeSqft: 25000,
      buildingType: "office",
      annualElectricityKwh: 350000,
      annualElectricityCost: 45500,
      operatingHours: 3000,
    });

    const result = classifyAndCalculateRate(input);

    expect(result.rateClass).toBe("class_b");
    expect(result.effectiveRateTotal).toBeCloseTo(0.13, 2);
    expect(result.demandChargeApplicable).toBe(true);
    expect(result.effectiveRateEnergy).toBeLessThan(result.effectiveRateTotal);
  });

  it("Large office tower (200k sqft, 3.5M kWh, $385k) → Class A or large B", () => {
    const input = makeInput({
      buildingSizeSqft: 200000,
      buildingType: "office",
      annualElectricityKwh: 3500000,
      annualElectricityCost: 385000,
      operatingHours: 3500,
    });

    const result = classifyAndCalculateRate(input);

    expect(["class_a", "class_b"]).toContain(result.rateClass);
    expect(result.effectiveRateTotal).toBeCloseTo(0.11, 2);
    expect(result.demandChargeApplicable).toBe(true);
    expect(result.estimatedPeakKw).toBeGreaterThan(1000);
  });

  it("Manufacturing plant (80k sqft, 2M kWh, $180k) → Class A eligible", () => {
    const input = makeInput({
      buildingSizeSqft: 80000,
      buildingType: "manufacturing",
      annualElectricityKwh: 2000000,
      annualElectricityCost: 180000,
      operatingHours: 5000,
    });

    const result = classifyAndCalculateRate(input);

    // Peak ≈ 2M / 5000 / 0.55 ≈ 727 kW
    expect(result.estimatedPeakKw).toBeGreaterThan(500);
    expect(result.classAEligible).toBe(true);
    expect(result.effectiveRateTotal).toBeCloseTo(0.09, 2);
  });

  it("Ambiguous near-50 kW building → defaults to Class B", () => {
    const input = makeInput({
      buildingSizeSqft: 12000,
      buildingType: "office",
      annualElectricityKwh: 120000,
      annualElectricityCost: 18000,
      operatingHours: 3000,
    });

    const result = classifyAndCalculateRate(input);

    // Peak ≈ 120000 / 3000 / 0.45 ≈ 88.9 kW → Class B
    expect(result.rateClass).toBe("class_b");
  });
});

// ---------------------------------------------------------------------------
// 2. Measure Card Savings — Section 9.3
// ---------------------------------------------------------------------------

describe("calculateMeasureSavings — measure card output", () => {
  it("RPP customer: single energy savings line, no demand", () => {
    const rateResult = classifyAndCalculateRate(
      makeInput({
        buildingType: "retail",
        annualElectricityKwh: 30000,
        annualElectricityCost: 5100,
        operatingHours: 3500,
      })
    );

    const savings = calculateMeasureSavings(
      5000, // 5,000 kWh saved by LED retrofit
      "led_lighting",
      rateResult,
      3500
    );

    expect(savings.energySavingsKwh).toBe(5000);
    expect(savings.energySavingsDollars).toBeGreaterThan(0);
    expect(savings.peakReductionApplicable).toBe(false);
    expect(savings.demandSavingsAnnual).toBeNull();
    expect(savings.totalSavingsAnnual).toBe(savings.energySavingsDollars);
    expect(savings.rateBasisLabel).toContain("Time-of-Use");
  });

  it("Class B customer: energy + demand savings = total", () => {
    const rateResult = classifyAndCalculateRate(
      makeInput({
        buildingType: "office",
        annualElectricityKwh: 350000,
        annualElectricityCost: 45500,
        operatingHours: 3000,
      })
    );

    const savings = calculateMeasureSavings(
      60000, // 60,000 kWh saved by HVAC upgrade
      "hvac_cooling",
      rateResult,
      3000
    );

    expect(savings.energySavingsKwh).toBe(60000);
    expect(savings.energySavingsDollars).toBeGreaterThan(0);
    expect(savings.peakReductionApplicable).toBe(true);
    expect(savings.demandSavingsAnnual).toBeGreaterThan(0);
    expect(savings.totalSavingsAnnual).toBe(
      savings.energySavingsDollars + savings.demandSavingsAnnual!
    );
    expect(savings.rateBasisLabel).toContain("spot market");
  });

  it("Envelope measure has no peak reduction", () => {
    const rateResult = classifyAndCalculateRate(
      makeInput({
        buildingType: "office",
        annualElectricityKwh: 350000,
        annualElectricityCost: 45500,
        operatingHours: 3000,
      })
    );

    const savings = calculateMeasureSavings(
      20000,
      "envelope",
      rateResult,
      3000
    );

    expect(savings.peakReductionApplicable).toBe(false);
    expect(savings.demandSavingsAnnual).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. 10-Year Projections — Approved Decision #3
// ---------------------------------------------------------------------------

describe("calculateTenYearProjections", () => {
  it("calculates three scenario cumulative savings", () => {
    const projections = calculateTenYearProjections(10000);

    // Conservative (2.0%): ~$109,497 over 10 years
    expect(projections.conservative).toBeGreaterThan(100000);
    expect(projections.conservative).toBeLessThan(115000);

    // Base case (2.5%): ~$111,203 over 10 years
    expect(projections.baseCase).toBeGreaterThan(projections.conservative);

    // High growth (4.5%): ~$120,786 over 10 years
    expect(projections.highGrowth).toBeGreaterThan(projections.baseCase);
  });

  it("base case always between conservative and high growth", () => {
    const projections = calculateTenYearProjections(5000);
    expect(projections.baseCase).toBeGreaterThan(projections.conservative);
    expect(projections.baseCase).toBeLessThan(projections.highGrowth);
  });

  it("zero savings yields zero projections", () => {
    const projections = calculateTenYearProjections(0);
    expect(projections.conservative).toBe(0);
    expect(projections.baseCase).toBe(0);
    expect(projections.highGrowth).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Display Formatting
// ---------------------------------------------------------------------------

describe("formatting helpers", () => {
  it("formats dollars in CAD", () => {
    const formatted = formatDollars(9600);
    expect(formatted).toContain("9,600");
  });

  it("formats kWh with comma separators", () => {
    const formatted = formatKwh(60000);
    expect(formatted).toContain("60,000");
  });
});

// ---------------------------------------------------------------------------
// 5. Error Direction — Conservative Savings Estimates
// ---------------------------------------------------------------------------

describe("error direction — conservative bias", () => {
  it("40-60 kW band defaults to Class B (higher demand charges = lower net savings)", () => {
    const input = makeInput({
      annualElectricityKwh: 60000,
      annualElectricityCost: 9600,
      operatingHours: 3000,
      buildingType: "retail",
    });

    const result = classifyAndCalculateRate(input);

    // Load factor 0.4, avg = 20 kW, peak = 50 kW → should be in 40-60 band
    // v1.1 correction: defaults to Class B
    // This is conservative because Class B effective rate may be lower than RPP
    // (but the classification is intentionally cautious about under-representing costs)
    expect(result.estimatedPeakKw).toBeGreaterThanOrEqual(40);
    expect(result.estimatedPeakKw).toBeLessThanOrEqual(60);
    expect(result.rateClass).toBe("class_b");
  });
});

// ---------------------------------------------------------------------------
// 6. Class A Eligibility — Manufacturing Exception
// ---------------------------------------------------------------------------

describe("Class A eligibility in full pipeline", () => {
  it("sets classAEligible for manufacturing ≥ 500 kW", () => {
    const input = makeInput({
      buildingType: "manufacturing",
      annualElectricityKwh: 2000000,
      annualElectricityCost: 180000,
      operatingHours: 5000,
    });

    const result = classifyAndCalculateRate(input);

    expect(result.classAEligible).toBe(true);
    // Peak ≈ 727 kW, which is ≥ 500 for manufacturing
    expect(result.estimatedPeakKw).toBeGreaterThanOrEqual(500);
  });

  it("does not set classAEligible for office < 1000 kW", () => {
    const input = makeInput({
      buildingType: "office",
      annualElectricityKwh: 350000,
      annualElectricityCost: 45500,
      operatingHours: 3000,
    });

    const result = classifyAndCalculateRate(input);

    expect(result.classAEligible).toBe(false);
  });
});
