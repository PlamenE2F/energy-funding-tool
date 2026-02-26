/**
 * CO₂ Emissions Engine
 *
 * Calculates building-level emissions (Scope 1 + Scope 2) and
 * per-measure CO₂ reductions.
 *
 * Sources: ECCC Emission Factors V3.0, October 2025
 *
 * CRITICAL: If gas consumption is estimated (not user-provided),
 * do NOT calculate Scope 1. Only show Scope 1 when actual fuel
 * data is provided.
 */

import type {
  EmissionsResult,
  MeasureEmissionsReduction,
  FuelSwitchingResult,
  FuelType,
} from "@/lib/eui/types";
import { getFuelTypeConfig } from "@/lib/config/fuel-types";
import {
  SCOPE2_AVERAGE_FACTOR,
  SCOPE2_AVERAGE_FACTOR_YEAR,
  DEFAULT_FURNACE_EFFICIENCY,
  DEFAULT_HEAT_PUMP_COP,
} from "@/lib/config/emissions";

// ---------------------------------------------------------------------------
// Building-Level Emissions
// ---------------------------------------------------------------------------

export interface EmissionsInput {
  annualElectricityKwh: number;
  buildingSizeSqft: number;
  /** Actual fuel data (null if not provided by user) */
  annualFuelVolume: number | null;
  fuelType: FuelType | null;
  /** Whether fuel data was estimated rather than user-provided */
  fuelIsEstimated: boolean;
}

/**
 * Calculate building-level CO₂ emissions (Scope 1 + Scope 2).
 *
 * Scope 1: Direct fuel combustion (only when actual fuel data provided)
 * Scope 2: Grid electricity consumption
 */
export function calculateBuildingEmissions(
  input: EmissionsInput
): EmissionsResult {
  // Scope 2: annual_kwh × 59 gCO₂eq/kWh ÷ 1,000,000 = tonnes
  const scope2Tonnes =
    (input.annualElectricityKwh * SCOPE2_AVERAGE_FACTOR) / 1_000_000;

  // Scope 1: only calculate from actual user-provided fuel data
  let scope1Tonnes: number | null = null;
  let scope1EmissionFactor: number | null = null;
  const scope1CalculatedFromEstimate = input.fuelIsEstimated;

  if (
    input.annualFuelVolume !== null &&
    input.annualFuelVolume > 0 &&
    input.fuelType !== null &&
    !input.fuelIsEstimated
  ) {
    const fuelConfig = getFuelTypeConfig(input.fuelType);
    scope1EmissionFactor = fuelConfig.emissionFactorTotal / 1000; // g → kg per unit
    // fuel_volume × emission_factor_total(g/unit) / 1,000,000 = tonnes
    scope1Tonnes =
      (input.annualFuelVolume * fuelConfig.emissionFactorTotal) / 1_000_000;
  }

  // Total: scope1 + scope2 (scope1 = 0 if not calculated)
  const totalEmissionsTonnes =
    scope2Tonnes + (scope1Tonnes ?? 0);

  // Carbon intensity: total_tonnes × 1000 / sqft = kg CO₂eq/sqft/year
  const carbonIntensity =
    (totalEmissionsTonnes * 1000) / input.buildingSizeSqft;

  return {
    scope2Tonnes: round(scope2Tonnes, 2),
    scope1Tonnes: scope1Tonnes !== null ? round(scope1Tonnes, 2) : null,
    totalEmissionsTonnes: round(totalEmissionsTonnes, 2),
    carbonIntensity: round(carbonIntensity, 3),
    scope1CalculatedFromEstimate,
    scope2AverageFactor: SCOPE2_AVERAGE_FACTOR,
    scope2AverageFactorYear: SCOPE2_AVERAGE_FACTOR_YEAR,
    scope1EmissionFactor,
  };
}

// ---------------------------------------------------------------------------
// Per-Measure CO₂ Reduction
// ---------------------------------------------------------------------------

/**
 * Calculate CO₂ reduction from an electricity-saving measure.
 *
 * co2_reduction = kwh_savings × 59 gCO₂eq/kWh ÷ 1,000,000 (tonnes)
 */
export function calculateElectricityCo2Reduction(
  kwhSavings: number
): MeasureEmissionsReduction {
  const co2ReductionElecTonnes =
    (kwhSavings * SCOPE2_AVERAGE_FACTOR) / 1_000_000;

  return {
    co2ReductionElectricityTonnes: round(co2ReductionElecTonnes, 3),
    co2ReductionFuelTonnes: null,
    co2ReductionTotalTonnes: round(co2ReductionElecTonnes, 3),
    co2AddedTonnes: null,
    co2NetReductionTonnes: round(co2ReductionElecTonnes, 3),
    emissionFactorUsed: SCOPE2_AVERAGE_FACTOR,
  };
}

/**
 * Calculate CO₂ reduction from a gas-saving measure.
 *
 * co2_reduction_gas = gas_m3_savings × 1.932 kg/m³ / 1000 (tonnes)
 */
export function calculateGasCo2Reduction(
  gasSavingsM3: number,
  fuelType: FuelType = "natural_gas"
): MeasureEmissionsReduction {
  const fuelConfig = getFuelTypeConfig(fuelType);
  // gas_savings × emission_factor_total(g/unit) / 1,000,000 = tonnes
  const co2ReductionFuelTonnes =
    (gasSavingsM3 * fuelConfig.emissionFactorTotal) / 1_000_000;

  return {
    co2ReductionElectricityTonnes: 0,
    co2ReductionFuelTonnes: round(co2ReductionFuelTonnes, 3),
    co2ReductionTotalTonnes: round(co2ReductionFuelTonnes, 3),
    co2AddedTonnes: null,
    co2NetReductionTonnes: round(co2ReductionFuelTonnes, 3),
    emissionFactorUsed: fuelConfig.emissionFactorTotal,
  };
}

/**
 * Calculate CO₂ impact from a combined electricity + gas savings measure.
 */
export function calculateCombinedCo2Reduction(
  kwhSavings: number,
  gasSavingsM3: number,
  fuelType: FuelType = "natural_gas"
): MeasureEmissionsReduction {
  const elecReduction = calculateElectricityCo2Reduction(kwhSavings);
  const gasReduction = calculateGasCo2Reduction(gasSavingsM3, fuelType);

  const totalTonnes =
    elecReduction.co2ReductionElectricityTonnes +
    gasReduction.co2ReductionFuelTonnes!;

  return {
    co2ReductionElectricityTonnes: elecReduction.co2ReductionElectricityTonnes,
    co2ReductionFuelTonnes: gasReduction.co2ReductionFuelTonnes,
    co2ReductionTotalTonnes: round(totalTonnes, 3),
    co2AddedTonnes: null,
    co2NetReductionTonnes: round(totalTonnes, 3),
    emissionFactorUsed: SCOPE2_AVERAGE_FACTOR,
  };
}

// ---------------------------------------------------------------------------
// Fuel Switching (Gas → Heat Pump)
// ---------------------------------------------------------------------------

/**
 * Calculate CO₂ impact of fuel switching from gas to heat pump.
 *
 * gas_energy_kwh = gas_m3 × 10.55
 * heat_pump_kwh = gas_energy_kwh × furnace_efficiency / heat_pump_COP
 * co2_avoided_scope1 = gas_m3 × 1.932 / 1000
 * co2_added_scope2 = heat_pump_kwh × 59 / 1,000,000
 * co2_net_reduction = co2_avoided - co2_added
 *
 * Defaults (Tier 2, configurable):
 *   Furnace efficiency: 80%
 *   Heat pump COP: 3.0
 */
export function calculateFuelSwitching(
  gasDisplacedM3: number,
  furnaceEfficiency: number = DEFAULT_FURNACE_EFFICIENCY,
  heatPumpCop: number = DEFAULT_HEAT_PUMP_COP
): FuelSwitchingResult {
  const gasConfig = getFuelTypeConfig("natural_gas");

  const gasEnergyKwh = gasDisplacedM3 * gasConfig.conversionFactorKwh;
  const heatPumpKwh = (gasEnergyKwh * furnaceEfficiency) / heatPumpCop;

  const co2AvoidedScope1 =
    (gasDisplacedM3 * gasConfig.emissionFactorTotal) / 1_000_000;
  const co2AddedScope2 =
    (heatPumpKwh * SCOPE2_AVERAGE_FACTOR) / 1_000_000;
  const co2NetReduction = co2AvoidedScope1 - co2AddedScope2;

  return {
    gasDisplacedM3,
    gasEnergyKwh: round(gasEnergyKwh, 0),
    heatPumpKwh: round(heatPumpKwh, 0),
    co2AvoidedScope1: round(co2AvoidedScope1, 3),
    co2AddedScope2: round(co2AddedScope2, 3),
    co2NetReduction: round(co2NetReduction, 3),
  };
}

/**
 * Build a MeasureEmissionsReduction from a fuel switching result.
 */
export function fuelSwitchingToMeasureReduction(
  switching: FuelSwitchingResult,
  additionalElecSavingsKwh: number = 0
): MeasureEmissionsReduction {
  const elecCo2 =
    (additionalElecSavingsKwh * SCOPE2_AVERAGE_FACTOR) / 1_000_000;

  return {
    co2ReductionElectricityTonnes: round(elecCo2, 3),
    co2ReductionFuelTonnes: round(switching.co2AvoidedScope1, 3),
    co2ReductionTotalTonnes: round(
      switching.co2AvoidedScope1 + elecCo2,
      3
    ),
    co2AddedTonnes: round(switching.co2AddedScope2, 3),
    co2NetReductionTonnes: round(
      switching.co2NetReduction + elecCo2,
      3
    ),
    emissionFactorUsed: SCOPE2_AVERAGE_FACTOR,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
