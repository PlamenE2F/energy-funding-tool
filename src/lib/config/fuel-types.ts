/**
 * Fuel Type Configuration — Emission Factors
 *
 * All emission factors from ECCC V3.0, October 2025.
 * GWPs per GGPPA Schedule 3 (AR4: CH₄=25, N₂O=298).
 *
 * CRITICAL: Gas conversion factor is 10.55 kWh/m³ (HHV),
 * NOT 10.36 (corrected from earlier Data Point Spec).
 */

import type { FuelTypeConfig, FuelType } from "@/lib/eui/types";

// ---------------------------------------------------------------------------
// Fuel Type Configs
// ---------------------------------------------------------------------------

export const FUEL_TYPE_CONFIGS: FuelTypeConfig[] = [
  {
    fuelTypeId: "natural_gas",
    fuelTypeName: "Natural Gas",
    conversionFactorKwh: 10.55, // kWh/m³ (HHV) — corrected from 10.36
    unit: "m3",
    emissionFactorCo2: 1921, // g CO₂/m³
    emissionFactorCh4: 0.037, // g CH₄/m³
    emissionFactorN2o: 0.035, // g N₂O/m³
    emissionFactorTotal: 1932, // g CO₂eq/m³ (with GWPs applied)
    gwpCh4: 25,
    gwpN2o: 298,
    emissionFactorSource: "ECCC V3.0 Tables 1.3/2.3/3.3/4.3",
    sourceSiteRatio: 1.02,
    effectiveDate: "2025-10-01",
  },
  {
    fuelTypeId: "fuel_oil",
    fuelTypeName: "Fuel Oil (#2)",
    conversionFactorKwh: 10.74, // kWh/litre
    unit: "litre",
    emissionFactorCo2: 2753, // g CO₂/L
    emissionFactorCh4: 0.026, // g CH₄/L
    emissionFactorN2o: 0.031, // g N₂O/L
    emissionFactorTotal: 2763, // g CO₂eq/L (with GWPs applied)
    gwpCh4: 25,
    gwpN2o: 298,
    emissionFactorSource: "ECCC V3.0 Tables 1.3/2.3/3.3/4.3",
    sourceSiteRatio: 1.01,
    effectiveDate: "2025-10-01",
  },
  {
    fuelTypeId: "propane",
    fuelTypeName: "Propane",
    conversionFactorKwh: 7.08, // kWh/litre
    unit: "litre",
    emissionFactorCo2: 1515, // g CO₂/L
    emissionFactorCh4: 0.024, // g CH₄/L
    emissionFactorN2o: 0.108, // g N₂O/L
    emissionFactorTotal: 1548, // g CO₂eq/L (with GWPs applied)
    gwpCh4: 25,
    gwpN2o: 298,
    emissionFactorSource: "ECCC V3.0 Tables 1.3/2.3/3.3/4.3",
    sourceSiteRatio: 1.01,
    effectiveDate: "2025-10-01",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getFuelTypeConfig(fuelTypeId: FuelType): FuelTypeConfig {
  const config = FUEL_TYPE_CONFIGS.find((ft) => ft.fuelTypeId === fuelTypeId);
  if (!config) {
    throw new Error(`Unknown fuel type: ${fuelTypeId}`);
  }
  return config;
}

/**
 * Convert fuel volume to kWh equivalent.
 * Uses the correct HHV conversion factor (10.55 kWh/m³ for gas).
 */
export function convertFuelToKwh(
  fuelTypeId: FuelType,
  volume: number
): number {
  const config = getFuelTypeConfig(fuelTypeId);
  return volume * config.conversionFactorKwh;
}
