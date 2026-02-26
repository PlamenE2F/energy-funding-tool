/**
 * Emissions Engine Tests
 *
 * Section 9.3: Emissions calculations
 * Covers: Scope 1, Scope 2, per-measure reductions, fuel switching
 */

import { describe, it, expect } from "vitest";
import {
  calculateBuildingEmissions,
  calculateElectricityCo2Reduction,
  calculateGasCo2Reduction,
  calculateCombinedCo2Reduction,
  calculateFuelSwitching,
  fuelSwitchingToMeasureReduction,
  type EmissionsInput,
} from "@/lib/emissions/calculator";

// ---------------------------------------------------------------------------
// Section 9.3: Building-Level Emissions
// ---------------------------------------------------------------------------

describe("Building emissions — Section 9.3", () => {
  it("Office (elec only): 350,000 kWh → 20.7 t Scope 2", () => {
    const result = calculateBuildingEmissions({
      annualElectricityKwh: 350000,
      buildingSizeSqft: 25000,
      annualFuelVolume: null,
      fuelType: null,
      fuelIsEstimated: false,
    });
    // 350,000 × 59 / 1,000,000 = 20.65 t
    expect(result.scope2Tonnes).toBeCloseTo(20.65, 1);
    expect(result.scope1Tonnes).toBeNull();
    expect(result.totalEmissionsTonnes).toBeCloseTo(20.65, 1);
  });

  it("Office (with gas): 350,000 kWh + 15,000 m³ → 20.7 t + 29.0 t = 49.7 t", () => {
    const result = calculateBuildingEmissions({
      annualElectricityKwh: 350000,
      buildingSizeSqft: 25000,
      annualFuelVolume: 15000,
      fuelType: "natural_gas",
      fuelIsEstimated: false,
    });
    // Scope 2: 350,000 × 59 / 1,000,000 = 20.65 t
    expect(result.scope2Tonnes).toBeCloseTo(20.65, 1);
    // Scope 1: 15,000 × 1,932 / 1,000,000 = 28.98 t
    expect(result.scope1Tonnes).toBeCloseTo(28.98, 1);
    // Total: ~49.63 t
    expect(result.totalEmissionsTonnes).toBeCloseTo(49.63, 0);
  });

  it("Warehouse: 500,000 kWh + 40,000 m³ → 29.5 t + 77.3 t = 106.8 t", () => {
    const result = calculateBuildingEmissions({
      annualElectricityKwh: 500000,
      buildingSizeSqft: 50000,
      annualFuelVolume: 40000,
      fuelType: "natural_gas",
      fuelIsEstimated: false,
    });
    // Scope 2: 500,000 × 59 / 1,000,000 = 29.5 t
    expect(result.scope2Tonnes).toBe(29.5);
    // Scope 1: 40,000 × 1,932 / 1,000,000 = 77.28 t
    expect(result.scope1Tonnes).toBeCloseTo(77.28, 1);
    // Total: ~106.78 t
    expect(result.totalEmissionsTonnes).toBeCloseTo(106.78, 0);
  });
});

// ---------------------------------------------------------------------------
// CRITICAL: Suppress Scope 1 for estimated fuel data
// ---------------------------------------------------------------------------

describe("Scope 1 suppression for estimated data", () => {
  it("does NOT calculate Scope 1 when fuel data is estimated", () => {
    const result = calculateBuildingEmissions({
      annualElectricityKwh: 350000,
      buildingSizeSqft: 25000,
      annualFuelVolume: 15000,
      fuelType: "natural_gas",
      fuelIsEstimated: true, // <-- estimated, not actual
    });
    expect(result.scope1Tonnes).toBeNull();
    expect(result.scope1CalculatedFromEstimate).toBe(true);
    // Total should be Scope 2 only
    expect(result.totalEmissionsTonnes).toBeCloseTo(20.65, 1);
  });
});

// ---------------------------------------------------------------------------
// Carbon Intensity
// ---------------------------------------------------------------------------

describe("Carbon intensity", () => {
  it("calculates kg CO₂eq/sqft/year", () => {
    const result = calculateBuildingEmissions({
      annualElectricityKwh: 350000,
      buildingSizeSqft: 25000,
      annualFuelVolume: null,
      fuelType: null,
      fuelIsEstimated: false,
    });
    // 20.65 t × 1000 / 25,000 sqft = 0.826 kg/sqft
    expect(result.carbonIntensity).toBeCloseTo(0.826, 2);
  });
});

// ---------------------------------------------------------------------------
// Per-Measure CO₂ Reductions
// ---------------------------------------------------------------------------

describe("Electricity CO₂ reduction", () => {
  it("calculates correctly: kWh × 59 / 1,000,000", () => {
    const result = calculateElectricityCo2Reduction(60000);
    // 60,000 × 59 / 1,000,000 = 3.54 t
    expect(result.co2ReductionElectricityTonnes).toBeCloseTo(3.54, 2);
    expect(result.co2NetReductionTonnes).toBeCloseTo(3.54, 2);
    expect(result.emissionFactorUsed).toBe(59);
  });
});

describe("Gas CO₂ reduction", () => {
  it("calculates correctly: m³ × 1,932 / 1,000,000", () => {
    const result = calculateGasCo2Reduction(5000);
    // 5,000 × 1,932 / 1,000,000 = 9.66 t
    expect(result.co2ReductionFuelTonnes).toBeCloseTo(9.66, 2);
    expect(result.co2NetReductionTonnes).toBeCloseTo(9.66, 2);
  });
});

describe("Combined CO₂ reduction", () => {
  it("adds electricity + gas reductions", () => {
    const result = calculateCombinedCo2Reduction(60000, 5000);
    // Elec: 3.54 + Gas: 9.66 = 13.2 t
    expect(result.co2ReductionTotalTonnes).toBeCloseTo(13.2, 1);
  });
});

// ---------------------------------------------------------------------------
// Fuel Switching (Gas → Heat Pump)
// ---------------------------------------------------------------------------

describe("Fuel switching calculation", () => {
  it("calculates net CO₂ reduction for gas-to-heat-pump switch", () => {
    const result = calculateFuelSwitching(10000);
    // gas_energy = 10,000 × 10.55 = 105,500 kWh
    expect(result.gasEnergyKwh).toBe(105500);
    // heat_pump_kwh = 105,500 × 0.80 / 3.0 = 28,133 kWh
    expect(result.heatPumpKwh).toBeCloseTo(28133, -1);
    // co2_avoided = 10,000 × 1,932 / 1,000,000 = 19.32 t
    expect(result.co2AvoidedScope1).toBeCloseTo(19.32, 2);
    // co2_added = 28,133 × 59 / 1,000,000 = 1.66 t
    expect(result.co2AddedScope2).toBeCloseTo(1.66, 1);
    // net = 19.32 - 1.66 = 17.66 t
    expect(result.co2NetReduction).toBeCloseTo(17.66, 1);
    // Net reduction should be positive (fuel switching is beneficial)
    expect(result.co2NetReduction).toBeGreaterThan(0);
  });

  it("uses configurable furnace efficiency and COP", () => {
    // High-efficiency furnace (95%) + standard COP (3.0)
    const result = calculateFuelSwitching(10000, 0.95, 3.0);
    // heat_pump_kwh = 105,500 × 0.95 / 3.0 = 33,408
    expect(result.heatPumpKwh).toBeCloseTo(33408, -1);
  });

  it("converts to MeasureEmissionsReduction format", () => {
    const switching = calculateFuelSwitching(10000);
    const reduction = fuelSwitchingToMeasureReduction(switching);
    expect(reduction.co2ReductionFuelTonnes).toBeCloseTo(19.32, 2);
    expect(reduction.co2AddedTonnes).toBeCloseTo(1.66, 1);
    expect(reduction.co2NetReductionTonnes).toBeCloseTo(17.66, 1);
  });
});

// ---------------------------------------------------------------------------
// Emission Factor Verification
// ---------------------------------------------------------------------------

describe("ECCC V3.0 emission factors", () => {
  it("uses Ontario grid factor of 59 gCO₂eq/kWh for 2026", () => {
    const result = calculateBuildingEmissions({
      annualElectricityKwh: 1000000,
      buildingSizeSqft: 100000,
      annualFuelVolume: null,
      fuelType: null,
      fuelIsEstimated: false,
    });
    expect(result.scope2AverageFactor).toBe(59);
    expect(result.scope2AverageFactorYear).toBe(2026);
    // 1,000,000 × 59 / 1,000,000 = 59 t
    expect(result.scope2Tonnes).toBe(59);
  });

  it("natural gas: 1,932 gCO₂eq/m³ total", () => {
    const result = calculateGasCo2Reduction(1000, "natural_gas");
    // 1,000 × 1,932 / 1,000,000 = 1.932 t
    expect(result.co2ReductionFuelTonnes).toBeCloseTo(1.932, 3);
  });

  it("fuel oil: 2,763 gCO₂eq/L total", () => {
    const result = calculateGasCo2Reduction(1000, "fuel_oil");
    // 1,000 × 2,763 / 1,000,000 = 2.763 t
    expect(result.co2ReductionFuelTonnes).toBeCloseTo(2.763, 3);
  });

  it("propane: 1,548 gCO₂eq/L total", () => {
    const result = calculateGasCo2Reduction(1000, "propane");
    // 1,000 × 1,548 / 1,000,000 = 1.548 t
    expect(result.co2ReductionFuelTonnes).toBeCloseTo(1.548, 3);
  });
});
