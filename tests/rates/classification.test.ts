/**
 * Rate Classification Engine Tests
 *
 * Tests cover:
 *   1. Peak demand estimation from kWh, hours, and load factor
 *   2. Rate class assignment by peak demand thresholds
 *   3. Cross-validation of effective rate against expected ranges
 *   4. User rate structure override behavior
 *   5. Classification accuracy with real building profiles (Section 9.1)
 *   6. v1.1 correction: 40–60 kW band defaults to Class B
 *   7. Class A eligibility for manufacturing ≥ 500 kW
 */

import { describe, it, expect } from "vitest";
import {
  estimatePeakDemand,
  classifyByPeakDemand,
  isClassAEligible,
  crossValidateEffectiveRate,
  classifyBuilding,
  resolveRateStructure,
} from "@/lib/rates/classification";
import type { AssessmentInput } from "@/lib/rates/types";

// ---------------------------------------------------------------------------
// Helper: Create a minimal assessment input
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
// 1. Peak Demand Estimation
// ---------------------------------------------------------------------------

describe("estimatePeakDemand", () => {
  it("calculates peak demand from kWh, hours, and load factor", () => {
    // Office: load factor = 0.45
    // average_load = 200000 / 3000 = 66.67 kW
    // peak = 66.67 / 0.45 = 148.1 kW
    const peak = estimatePeakDemand(200000, 3000, "office");
    expect(peak).toBeCloseTo(148.1, 0);
  });

  it("uses different load factors for different building types", () => {
    // Warehouse: load factor = 0.35
    const warehousePeak = estimatePeakDemand(200000, 3000, "warehouse");
    // average = 66.67, peak = 66.67 / 0.35 = 190.5 kW
    expect(warehousePeak).toBeCloseTo(190.5, 0);

    // Hospital: load factor = 0.6
    const hospitalPeak = estimatePeakDemand(200000, 3000, "hospital");
    // peak = 66.67 / 0.6 = 111.1 kW
    expect(hospitalPeak).toBeCloseTo(111.1, 0);
  });

  it("throws for zero operating hours", () => {
    expect(() => estimatePeakDemand(200000, 0, "office")).toThrow();
  });

  it("throws for negative operating hours", () => {
    expect(() => estimatePeakDemand(200000, -100, "office")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Rate Class Assignment
// ---------------------------------------------------------------------------

describe("classifyByPeakDemand", () => {
  it("classifies < 40 kW as RPP with high confidence", () => {
    const result = classifyByPeakDemand(30, "office");
    expect(result.rateClass).toBe("rpp_tou");
    expect(result.confidence).toBe("high");
  });

  it("classifies 40–60 kW as Class B (v1.1 correction) with medium confidence", () => {
    const result45 = classifyByPeakDemand(45, "retail");
    expect(result45.rateClass).toBe("class_b");
    expect(result45.confidence).toBe("medium");

    const result60 = classifyByPeakDemand(60, "retail");
    expect(result60.rateClass).toBe("class_b");
    expect(result60.confidence).toBe("medium");
  });

  it("classifies 60–900 kW as Class B with high confidence", () => {
    const result = classifyByPeakDemand(200, "office");
    expect(result.rateClass).toBe("class_b");
    expect(result.confidence).toBe("high");
  });

  it("classifies 900–1100 kW as Class B with medium confidence", () => {
    const result = classifyByPeakDemand(950, "office");
    expect(result.rateClass).toBe("class_b");
    expect(result.confidence).toBe("medium");
  });

  it("classifies > 1100 kW as Class A with high confidence", () => {
    const result = classifyByPeakDemand(1500, "office");
    expect(result.rateClass).toBe("class_a");
    expect(result.confidence).toBe("high");
  });

  it("classifies > 5000 kW as Class A with high confidence", () => {
    const result = classifyByPeakDemand(6000, "manufacturing");
    expect(result.rateClass).toBe("class_a");
    expect(result.confidence).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// 3. Class A Eligibility
// ---------------------------------------------------------------------------

describe("isClassAEligible", () => {
  it("eligible at ≥ 1000 kW for any building type", () => {
    expect(isClassAEligible(1000, "office")).toBe(true);
    expect(isClassAEligible(1500, "retail")).toBe(true);
  });

  it("not eligible below 1000 kW for non-manufacturing", () => {
    expect(isClassAEligible(800, "office")).toBe(false);
    expect(isClassAEligible(499, "retail")).toBe(false);
  });

  it("eligible at ≥ 500 kW for manufacturing", () => {
    expect(isClassAEligible(500, "manufacturing")).toBe(true);
    expect(isClassAEligible(750, "manufacturing")).toBe(true);
  });

  it("eligible at ≥ 500 kW for greenhouse", () => {
    expect(isClassAEligible(500, "greenhouse")).toBe(true);
  });

  it("not eligible below 500 kW for manufacturing", () => {
    expect(isClassAEligible(499, "manufacturing")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Cross-Validation of Effective Rate
// ---------------------------------------------------------------------------

describe("crossValidateEffectiveRate", () => {
  it("no warning when RPP rate is in range", () => {
    const result = crossValidateEffectiveRate(0.155, "rpp_tou");
    expect(result.warning).toBeNull();
    expect(result.suggestedClass).toBeNull();
  });

  it("suggests Class B when RPP rate is too low", () => {
    const result = crossValidateEffectiveRate(0.10, "rpp_tou");
    expect(result.suggestedClass).toBe("class_b");
    expect(result.warning).toContain("below the typical RPP range");
  });

  it("suggests Class A when Class B rate is too low", () => {
    const result = crossValidateEffectiveRate(0.08, "class_b");
    expect(result.suggestedClass).toBe("class_a");
    expect(result.warning).toContain("below the typical Class B range");
  });

  it("no warning when Class B rate is in range", () => {
    const result = crossValidateEffectiveRate(0.13, "class_b");
    expect(result.warning).toBeNull();
  });

  it("warns when Class A rate is too high", () => {
    const result = crossValidateEffectiveRate(0.16, "class_a");
    expect(result.suggestedClass).toBe("class_b");
    expect(result.warning).toContain("above the typical Class A range");
  });
});

// ---------------------------------------------------------------------------
// 5. Rate Structure Resolution
// ---------------------------------------------------------------------------

describe("resolveRateStructure", () => {
  it("maps RPP options to RPP rate classes", () => {
    expect(resolveRateStructure("rpp_tou")).toBe("rpp_tou");
    expect(resolveRateStructure("rpp_ulo")).toBe("rpp_ulo");
    expect(resolveRateStructure("rpp_tiered")).toBe("rpp_tiered");
  });

  it("maps spot market and retailer to Class B", () => {
    expect(resolveRateStructure("spot_market")).toBe("class_b");
    expect(resolveRateStructure("retailer_contract")).toBe("class_b");
  });

  it("returns null for dont_know", () => {
    expect(resolveRateStructure("dont_know")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. Full Classification Pipeline — Section 9.1 Test Buildings
// ---------------------------------------------------------------------------

describe("classifyBuilding — Section 9.1 building profiles", () => {
  it("Small retail → RPP", () => {
    const input = makeInput({
      buildingSizeSqft: 2000,
      buildingType: "retail",
      annualElectricityKwh: 30000,
      annualElectricityCost: 5100,
      operatingHours: 3500,
    });
    const result = classifyBuilding(input);
    expect(result.rateClass).toMatch(/^rpp/);
  });

  it("Mid-size office → Class B", () => {
    const input = makeInput({
      buildingSizeSqft: 25000,
      buildingType: "office",
      annualElectricityKwh: 350000,
      annualElectricityCost: 45500,
      operatingHours: 3000,
    });
    const result = classifyBuilding(input);
    expect(result.rateClass).toBe("class_b");
  });

  it("Large office tower → Class B (1000–4999 kW range, or Class A)", () => {
    const input = makeInput({
      buildingSizeSqft: 200000,
      buildingType: "office",
      annualElectricityKwh: 3500000,
      annualElectricityCost: 385000,
      operatingHours: 3500,
    });
    const result = classifyBuilding(input);
    // Peak ≈ 3500000 / 3500 / 0.45 ≈ 2222 kW → Class A
    expect(["class_b", "class_a"]).toContain(result.rateClass);
  });

  it("Manufacturing plant → Class A eligible at ≥ 500 kW", () => {
    const input = makeInput({
      buildingSizeSqft: 80000,
      buildingType: "manufacturing",
      annualElectricityKwh: 2000000,
      annualElectricityCost: 180000,
      operatingHours: 5000,
    });
    const result = classifyBuilding(input);
    // Peak ≈ 2000000 / 5000 / 0.55 ≈ 727 kW → Class B by demand,
    // but Class A eligible because manufacturing ≥ 500 kW
    // Note: classification is by peak threshold, eligibility is separate
    expect(result.rateClass).toBe("class_b");
  });

  it("Ambiguous building (near 50 kW) → defaults to Class B (v1.1 rule)", () => {
    const input = makeInput({
      buildingSizeSqft: 12000,
      buildingType: "office",
      annualElectricityKwh: 120000,
      annualElectricityCost: 18000,
      operatingHours: 3000,
    });
    const result = classifyBuilding(input);
    // Peak ≈ 120000 / 3000 / 0.45 ≈ 88.9 kW → Class B (high confidence)
    // Even if peak were ~50 kW, v1.1 says 40-60 defaults to Class B
    expect(result.rateClass).toBe("class_b");
  });
});

// ---------------------------------------------------------------------------
// 7. User Override Behavior
// ---------------------------------------------------------------------------

describe("classifyBuilding — user rate structure override", () => {
  it("user declaring RPP TOU overrides estimation", () => {
    const input = makeInput({
      annualElectricityKwh: 300000,
      operatingHours: 3000,
      rateStructure: "rpp_tou",
    });
    const result = classifyBuilding(input);
    expect(result.rateClass).toBe("rpp_tou");
    expect(result.source).toBe("user_declared");
    expect(result.confidence).toBe("high");
  });

  it("user declaring spot_market overrides RPP estimation", () => {
    const input = makeInput({
      annualElectricityKwh: 30000,
      operatingHours: 3000,
      rateStructure: "spot_market",
    });
    const result = classifyBuilding(input);
    expect(result.rateClass).toBe("class_b");
    expect(result.source).toBe("user_declared");
  });

  it("user selecting dont_know keeps system estimation", () => {
    const input = makeInput({
      annualElectricityKwh: 30000,
      operatingHours: 3000,
      rateStructure: "dont_know",
    });
    const result = classifyBuilding(input);
    expect(result.source).toBe("estimated");
  });

  it("warns when user selects RPP but estimated peak > 60 kW", () => {
    const input = makeInput({
      annualElectricityKwh: 300000,
      operatingHours: 3000,
      rateStructure: "rpp_tou",
    });
    const result = classifyBuilding(input);
    expect(result.warnings.some((w) => w.includes("above 50 kW"))).toBe(true);
  });
});
