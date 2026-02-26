/**
 * EUI & Emissions Type Definitions
 *
 * Types for the EUI baseline calculation, benchmark comparison,
 * CO₂ emissions engine, and weather normalization.
 */

import type { BuildingType } from "@/lib/rates/types";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Which calculation path was used */
export type CompletionPath = "fast" | "standard" | "enhanced";

/** Benchmark classification for display logic */
export type BenchmarkClassification = "green" | "yellow" | "red";

/** Three-tier benchmark comparison indicator */
export type BenchmarkTier = "below_median" | "near_median" | "above_median";

/** Quality of weather regression fit */
export type RegressionQuality = "good" | "moderate" | "poor";

/** Primary fuel type for Scope 1 calculations */
export type FuelType = "natural_gas" | "fuel_oil" | "propane";

// ---------------------------------------------------------------------------
// Building Type Benchmark Config
// ---------------------------------------------------------------------------

export interface BuildingTypeConfig {
  buildingTypeId: string;
  buildingTypeName: string;
  benchmarkSource: string | null;
  benchmarkEuiGjM2: number | null;
  benchmarkEuiKwhSqft: number | null;
  electricityFraction: number;
  benchmarkClassification: BenchmarkClassification;
  energyStarEligible: boolean;
  benchmarkCaveatText: string | null;
  loadFactor: number;
}

// ---------------------------------------------------------------------------
// Fuel Type Config
// ---------------------------------------------------------------------------

export interface FuelTypeConfig {
  fuelTypeId: FuelType;
  fuelTypeName: string;
  conversionFactorKwh: number;
  unit: string;
  emissionFactorCo2: number;
  emissionFactorCh4: number;
  emissionFactorN2o: number;
  emissionFactorTotal: number;
  gwpCh4: number;
  gwpN2o: number;
  emissionFactorSource: string;
  sourceSiteRatio: number;
  effectiveDate: string;
}

// ---------------------------------------------------------------------------
// EUI Calculation Input
// ---------------------------------------------------------------------------

export interface EuiInput {
  buildingSizeSqft: number;
  buildingType: BuildingType;
  annualElectricityKwh: number;
  /** Gas in m³ (null if not provided) */
  annualGasM3: number | null;
  /** Alternative fuel type (when not natural gas) */
  primaryFuelType: FuelType | null;
  /** Alternative fuel volume in native units (litres for oil/propane) */
  fuelVolume: number | null;
  /** Monthly electricity data for enhanced path [kWh per month, 12 entries] */
  monthlyElectricityKwh: number[] | null;
  /** Monthly gas data for enhanced path [m³ per month, 12 entries] */
  monthlyGasM3: number[] | null;
  /** Monthly HDD values (base 18°C) matching billing months */
  monthlyHdd: number[] | null;
  /** TMY annual HDD for the building's climate zone */
  tmyAnnualHdd: number | null;
}

// ---------------------------------------------------------------------------
// EUI Calculation Result
// ---------------------------------------------------------------------------

export interface EuiResult {
  completionPath: CompletionPath;
  /** Electricity-only EUI (kWh/sqft/year) — always calculated */
  euiElectric: number;
  /** Total site EUI (ekWh/sqft/year) — null if no fuel data */
  euiTotal: number | null;
  /** Weather-normalized EUI — enhanced path only */
  euiWeatherNormalized: number | null;
  /** Source EUI — stored for ENERGY STAR, not displayed */
  euiSourceElectric: number;
  /** Source total EUI */
  euiSourceTotal: number | null;
  /** Gas converted to kWh */
  gasKwhEquivalent: number | null;
}

// ---------------------------------------------------------------------------
// Benchmark Comparison Result
// ---------------------------------------------------------------------------

export interface BenchmarkResult {
  /** Whether to show benchmark comparison */
  comparisonShown: boolean;
  /** Benchmark classification */
  classification: BenchmarkClassification;
  /** Benchmark EUI used for comparison (kWh/sqft) */
  benchmarkEui: number | null;
  /** User EUI vs median: (user - median) / median × 100 */
  userVsMedianPct: number | null;
  /** Three-tier indicator */
  benchmarkTier: BenchmarkTier | null;
  /** Caveat text for YELLOW types */
  caveatText: string | null;
  /** Cost intensity range for GREEN types */
  costIntensityLow: number | null;
  costIntensityHigh: number | null;
  /** Note about comparison basis */
  comparisonNote: string | null;
}

// ---------------------------------------------------------------------------
// Emissions Result
// ---------------------------------------------------------------------------

export interface EmissionsResult {
  /** Scope 2 — grid electricity (tonnes CO₂eq/year) */
  scope2Tonnes: number;
  /** Scope 1 — fuel combustion (tonnes CO₂eq/year), null if no fuel data */
  scope1Tonnes: number | null;
  /** Total emissions */
  totalEmissionsTonnes: number;
  /** Carbon intensity (kg CO₂eq/sqft/year) */
  carbonIntensity: number;
  /** Whether Scope 1 was calculated from estimated (not actual) fuel data */
  scope1CalculatedFromEstimate: boolean;
  /** Emission factors used (for traceability) */
  scope2AverageFactor: number;
  scope2AverageFactorYear: number;
  scope1EmissionFactor: number | null;
}

// ---------------------------------------------------------------------------
// Per-Measure Emissions Reduction
// ---------------------------------------------------------------------------

export interface MeasureEmissionsReduction {
  /** CO₂ reduced from electricity savings (tonnes) */
  co2ReductionElectricityTonnes: number;
  /** CO₂ reduced from fuel savings (tonnes), null if N/A */
  co2ReductionFuelTonnes: number | null;
  /** Total CO₂ reduction (tonnes) */
  co2ReductionTotalTonnes: number;
  /** CO₂ added from fuel switching (new electricity use, tonnes), null if N/A */
  co2AddedTonnes: number | null;
  /** Net CO₂ reduction after additions */
  co2NetReductionTonnes: number;
  /** Emission factor used */
  emissionFactorUsed: number;
}

// ---------------------------------------------------------------------------
// Weather Normalization / Regression
// ---------------------------------------------------------------------------

export interface RegressionResult {
  modelType: string;
  /** Monthly baseload (kWh/month or m³/month) */
  baseloadMonthly: number;
  /** Heating sensitivity (kWh/HDD or m³/HDD) */
  betaHeat: number;
  /** R² goodness of fit */
  rSquared: number;
  /** Change-point temperature (°C) */
  changepointTemp: number;
  /** Quality flag based on R² */
  qualityFlag: RegressionQuality;
  /** Annual baseload (baseload × 12) */
  baseloadAnnual: number;
  /** Weather-dependent annual consumption */
  weatherDepAnnual: number;
}

// ---------------------------------------------------------------------------
// Fuel Switching Calculation
// ---------------------------------------------------------------------------

export interface FuelSwitchingResult {
  gasDisplacedM3: number;
  gasEnergyKwh: number;
  heatPumpKwh: number;
  co2AvoidedScope1: number;
  co2AddedScope2: number;
  co2NetReduction: number;
}
