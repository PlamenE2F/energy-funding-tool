/**
 * Effective Rate Calculation Tests
 *
 * Tests cover:
 *   1. Method A: User-derived effective rate
 *   2. Method B: Default rate fallback
 *   3. Demand charge separation for Class B
 *   4. Hard validation (rate > $0.35/kWh)
 *   5. Edge cases (missing cost, negative values, extreme rates)
 */

import { describe, it, expect } from "vitest";
import {
  calculateEffectiveRate,
  validateEffectiveRate,
} from "@/lib/rates/effective-rate";
import type { AssessmentInput } from "@/lib/rates/types";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<AssessmentInput> = {}): AssessmentInput {
  return {
    buildingSizeSqft: 10000,
    buildingType: "office",
    operatingHours: 3000,
    annualElectricityKwh: 200000,
    annualElectricityCost: null,
    peakDemandKw: null,
    rateStructure: null,
    postalCode: "M5V 3L9",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Method A: User-Derived
// ---------------------------------------------------------------------------

describe("calculateEffectiveRate — Method A (user-derived)", () => {
  it("calculates all-in effective rate from cost ÷ kWh", () => {
    const input = makeInput({
      annualElectricityKwh: 350000,
      annualElectricityCost: 45500,
    });
    const result = calculateEffectiveRate(input, "class_b", 150);
    expect(result.source).toBe("user_derived");
    expect(result.effectiveRateTotal).toBeCloseTo(0.13, 2);
  });

  it("RPP: energy rate equals total rate (no demand charges)", () => {
    const input = makeInput({
      annualElectricityKwh: 30000,
      annualElectricityCost: 5100,
    });
    const result = calculateEffectiveRate(input, "rpp_tou", 15);
    expect(result.effectiveRateTotal).toBeCloseTo(0.17, 2);
    expect(result.effectiveRateEnergy).toBe(result.effectiveRateTotal);
    expect(result.demandChargeApplicable).toBe(false);
    expect(result.demandChargeRate).toBeNull();
  });

  it("Class B: separates demand charges from energy rate", () => {
    const input = makeInput({
      annualElectricityKwh: 350000,
      annualElectricityCost: 45500,
    });
    const result = calculateEffectiveRate(input, "class_b", 150);
    // Total rate: 45500 / 350000 = $0.13/kWh
    expect(result.effectiveRateTotal).toBeCloseTo(0.13, 2);
    // Demand charges: 150 kW * $17.84/kW/mo * 12 = $32,112
    // Energy: 45500 - 32112 = 13,388
    // Energy rate: 13388 / 350000 ≈ $0.038/kWh
    expect(result.effectiveRateEnergy).toBeLessThan(result.effectiveRateTotal);
    expect(result.demandChargeApplicable).toBe(true);
    expect(result.demandChargeRate).toBeGreaterThan(0);
  });

  it("handles case where demand charges exceed total cost", () => {
    // Low cost but high peak — demand charges > total
    const input = makeInput({
      annualElectricityKwh: 100000,
      annualElectricityCost: 10000,
    });
    const result = calculateEffectiveRate(input, "class_b", 500);
    // Demand: 500 * 17.84 * 12 = $107,040 > $10,000
    // Should fall back to default energy rate
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.effectiveRateEnergy).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Method B: Defaults
// ---------------------------------------------------------------------------

describe("calculateEffectiveRate — Method B (defaults)", () => {
  it("uses default rates when cost is null", () => {
    const input = makeInput({
      annualElectricityKwh: 350000,
      annualElectricityCost: null,
    });
    const result = calculateEffectiveRate(input, "rpp_tou", 15);
    expect(result.source).toBe("class_default");
    expect(result.effectiveRateTotal).toBe(0.155);
    expect(result.effectiveRateEnergy).toBe(0.155);
  });

  it("uses Class B defaults when cost is missing", () => {
    const input = makeInput({
      annualElectricityKwh: 350000,
      annualElectricityCost: null,
    });
    const result = calculateEffectiveRate(input, "class_b", 150);
    expect(result.source).toBe("class_default");
    expect(result.effectiveRateTotal).toBe(0.13);
    expect(result.effectiveRateEnergy).toBe(0.105);
    expect(result.demandChargeApplicable).toBe(true);
  });

  it("uses Class A defaults when cost is missing", () => {
    const input = makeInput({
      annualElectricityKwh: 3500000,
      annualElectricityCost: null,
    });
    const result = calculateEffectiveRate(input, "class_a", 2000);
    expect(result.source).toBe("class_default");
    expect(result.effectiveRateTotal).toBe(0.095);
    expect(result.effectiveRateEnergy).toBe(0.075);
  });
});

// ---------------------------------------------------------------------------
// 3. Hard Validation
// ---------------------------------------------------------------------------

describe("validateEffectiveRate", () => {
  it("returns null for valid rates", () => {
    expect(validateEffectiveRate(0.13)).toBeNull();
    expect(validateEffectiveRate(0.35)).toBeNull();
  });

  it("returns error for rate > $0.35/kWh", () => {
    const error = validateEffectiveRate(0.40);
    expect(error).toContain("exceeds $0.35/kWh");
  });

  it("returns error for zero or negative rate", () => {
    expect(validateEffectiveRate(0)).not.toBeNull();
    expect(validateEffectiveRate(-0.10)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Section 9.2 — Effective Rate Validation Test Cases
// ---------------------------------------------------------------------------

describe("Section 9.2 — Effective rate validation", () => {
  it("Small retail: rate falls in RPP range", () => {
    const input = makeInput({
      annualElectricityKwh: 30000,
      annualElectricityCost: 5100,
    });
    const result = calculateEffectiveRate(input, "rpp_tou", 15);
    // 5100 / 30000 = $0.17/kWh — within RPP range ($0.12–$0.20)
    expect(result.effectiveRateTotal).toBeGreaterThanOrEqual(0.12);
    expect(result.effectiveRateTotal).toBeLessThanOrEqual(0.20);
  });

  it("Mid-size office: rate falls in Class B range", () => {
    const input = makeInput({
      annualElectricityKwh: 350000,
      annualElectricityCost: 45500,
    });
    const result = calculateEffectiveRate(input, "class_b", 150);
    // 45500 / 350000 = $0.13/kWh — within Class B range ($0.10–$0.16)
    expect(result.effectiveRateTotal).toBeGreaterThanOrEqual(0.10);
    expect(result.effectiveRateTotal).toBeLessThanOrEqual(0.16);
  });

  it("Large office: rate falls in Class B/A overlap range", () => {
    const input = makeInput({
      annualElectricityKwh: 3500000,
      annualElectricityCost: 385000,
    });
    const result = calculateEffectiveRate(input, "class_a", 2200);
    // 385000 / 3500000 = $0.11/kWh — within Class A range ($0.08–$0.14)
    expect(result.effectiveRateTotal).toBeGreaterThanOrEqual(0.08);
    expect(result.effectiveRateTotal).toBeLessThanOrEqual(0.14);
  });
});
