/**
 * EUI Calculator Tests
 *
 * Section 9.1: EUI Calculations
 * Section 9.4: Gas Conversion Factor (10.55, NOT 10.36)
 */

import { describe, it, expect } from "vitest";
import { calculateEui, determineCompletionPath } from "@/lib/eui/calculator";
import type { EuiInput } from "@/lib/eui/types";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<EuiInput> = {}): EuiInput {
  return {
    buildingSizeSqft: 25000,
    buildingType: "office",
    annualElectricityKwh: 350000,
    annualGasM3: null,
    primaryFuelType: null,
    fuelVolume: null,
    monthlyElectricityKwh: null,
    monthlyGasM3: null,
    monthlyHdd: null,
    tmyAnnualHdd: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Section 9.1: EUI Calculations
// ---------------------------------------------------------------------------

describe("EUI calculations — Section 9.1 test buildings", () => {
  it("Small office: 5,000 sqft, 75,000 kWh → 15.0 kWh/sqft (electric only)", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 5000,
        annualElectricityKwh: 75000,
        annualGasM3: null,
      })
    );
    expect(result.completionPath).toBe("fast");
    expect(result.euiElectric).toBe(15.0);
    expect(result.euiTotal).toBeNull();
  });

  it("Mid-size office: 25,000 sqft, 350,000 kWh, 15,000 m³ gas → ~20.3 ekWh/sqft", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 25000,
        annualElectricityKwh: 350000,
        annualGasM3: 15000,
      })
    );
    expect(result.completionPath).toBe("standard");
    // Gas equiv: 15,000 × 10.55 = 158,250 kWh
    // Total: 350,000 + 158,250 = 508,250
    // EUI: 508,250 / 25,000 = 20.33
    expect(result.gasKwhEquivalent).toBe(158250);
    expect(result.euiTotal).toBeCloseTo(20.3, 1);
  });

  it("Grocery store: 15,000 sqft, 400,000 kWh, 5,000 m³ gas → ~30.2 ekWh/sqft", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 15000,
        buildingType: "grocery",
        annualElectricityKwh: 400000,
        annualGasM3: 5000,
      })
    );
    // Gas equiv: 5,000 × 10.55 = 52,750
    // Total: 400,000 + 52,750 = 452,750
    // EUI: 452,750 / 15,000 = 30.18
    expect(result.euiTotal).toBeCloseTo(30.2, 0);
  });

  it("Warehouse: 50,000 sqft, 500,000 kWh, 40,000 m³ gas → ~18.4 ekWh/sqft", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 50000,
        buildingType: "warehouse",
        annualElectricityKwh: 500000,
        annualGasM3: 40000,
      })
    );
    // Gas equiv: 40,000 × 10.55 = 422,000
    // Total: 500,000 + 422,000 = 922,000
    // EUI: 922,000 / 50,000 = 18.44
    expect(result.euiTotal).toBeCloseTo(18.4, 0);
  });
});

// ---------------------------------------------------------------------------
// Section 9.4: Gas Conversion Factor
// ---------------------------------------------------------------------------

describe("Gas conversion factor", () => {
  it("uses 10.55 kWh/m³ (NOT 10.36)", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 10000,
        annualElectricityKwh: 100000,
        annualGasM3: 10000,
      })
    );
    // Gas equiv should be 10,000 × 10.55 = 105,500
    expect(result.gasKwhEquivalent).toBe(105500);
    // NOT 10,000 × 10.36 = 103,600
    expect(result.gasKwhEquivalent).not.toBe(103600);
  });
});

// ---------------------------------------------------------------------------
// Completion Path Determination
// ---------------------------------------------------------------------------

describe("determineCompletionPath", () => {
  it("returns 'fast' with electricity only", () => {
    expect(determineCompletionPath(makeInput())).toBe("fast");
  });

  it("returns 'standard' with gas data", () => {
    expect(
      determineCompletionPath(makeInput({ annualGasM3: 15000 }))
    ).toBe("standard");
  });

  it("returns 'standard' with fuel oil data", () => {
    expect(
      determineCompletionPath(
        makeInput({ primaryFuelType: "fuel_oil", fuelVolume: 5000 })
      )
    ).toBe("standard");
  });

  it("returns 'enhanced' with 12 months data + HDD + TMY", () => {
    const monthlyElec = Array(12).fill(30000);
    // Mix of heating and non-heating months
    const monthlyHdd = [600, 550, 400, 200, 50, 10, 0, 0, 30, 150, 350, 550];
    expect(
      determineCompletionPath(
        makeInput({
          monthlyElectricityKwh: monthlyElec,
          monthlyHdd: monthlyHdd,
          tmyAnnualHdd: 3800,
        })
      )
    ).toBe("enhanced");
  });

  it("falls back to 'fast' with < 9 months data", () => {
    expect(
      determineCompletionPath(
        makeInput({
          monthlyElectricityKwh: Array(6).fill(30000),
          monthlyHdd: Array(6).fill(200),
          tmyAnnualHdd: 3800,
        })
      )
    ).toBe("fast");
  });

  it("falls back to 'fast' when no heating season data", () => {
    // All low HDD — no heating season
    expect(
      determineCompletionPath(
        makeInput({
          monthlyElectricityKwh: Array(12).fill(30000),
          monthlyHdd: Array(12).fill(20), // No months > 100
          tmyAnnualHdd: 3800,
        })
      )
    ).toBe("fast");
  });
});

// ---------------------------------------------------------------------------
// Source EUI (stored for ENERGY STAR)
// ---------------------------------------------------------------------------

describe("Source EUI calculation", () => {
  it("applies source-site ratio 2.05 for electricity", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 10000,
        annualElectricityKwh: 100000,
      })
    );
    // Source EUI = 100,000 × 2.05 / 10,000 = 20.5
    expect(result.euiSourceElectric).toBe(20.5);
  });

  it("applies separate source-site ratios for fuel", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 10000,
        annualElectricityKwh: 100000,
        annualGasM3: 5000,
      })
    );
    // Gas kWh = 5000 × 10.55 = 52,750
    // Source = (100,000 × 2.05 + 52,750 × 1.02) / 10,000
    //        = (205,000 + 53,805) / 10,000 = 25.88
    expect(result.euiSourceTotal).toBeCloseTo(25.9, 0);
  });
});

// ---------------------------------------------------------------------------
// Alternative Fuel Types
// ---------------------------------------------------------------------------

describe("Alternative fuel types", () => {
  it("converts fuel oil at 10.74 kWh/litre", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 10000,
        annualElectricityKwh: 100000,
        primaryFuelType: "fuel_oil",
        fuelVolume: 5000,
      })
    );
    // 5,000 L × 10.74 = 53,700 kWh
    expect(result.gasKwhEquivalent).toBe(53700);
  });

  it("converts propane at 7.08 kWh/litre", () => {
    const result = calculateEui(
      makeInput({
        buildingSizeSqft: 10000,
        annualElectricityKwh: 100000,
        primaryFuelType: "propane",
        fuelVolume: 5000,
      })
    );
    // 5,000 L × 7.08 = 35,400 kWh
    expect(result.gasKwhEquivalent).toBe(35400);
  });
});
