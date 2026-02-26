/**
 * EUI Baseline & Emissions Engine — Public API
 *
 * Main entry point for EUI calculations, benchmark comparisons,
 * and CO₂ emissions. Integrates with the rate classification
 * framework for cost intensity derivation.
 */

// EUI Calculator
export { calculateEui, determineCompletionPath } from "./calculator";

// Benchmark Comparison
export {
  compareToBenchmark,
  getBenchmarkComparisonText,
  getCostIntensityText,
} from "./benchmark";

// Weather Normalization
export {
  runWeatherNormalization,
  runRegression,
} from "./weather-normalization";

// Emissions
export {
  calculateBuildingEmissions,
  calculateElectricityCo2Reduction,
  calculateGasCo2Reduction,
  calculateCombinedCo2Reduction,
  calculateFuelSwitching,
  fuelSwitchingToMeasureReduction,
} from "@/lib/emissions/calculator";

// Types
export type {
  EuiInput,
  EuiResult,
  CompletionPath,
  BenchmarkResult,
  BenchmarkClassification,
  BenchmarkTier,
  EmissionsResult,
  MeasureEmissionsReduction,
  FuelSwitchingResult,
  FuelType,
  RegressionResult,
  RegressionQuality,
  BuildingTypeConfig,
  FuelTypeConfig,
} from "./types";

// Config
export { getBuildingTypeConfig, BUILDING_TYPE_CONFIGS } from "@/lib/config/building-types";
export { getFuelTypeConfig, FUEL_TYPE_CONFIGS, convertFuelToKwh } from "@/lib/config/fuel-types";
export {
  SCOPE2_AVERAGE_FACTOR,
  SCOPE2_AVERAGE_FACTOR_YEAR,
  BENCHMARK_COST_RATE_ELECTRIC,
  BENCHMARK_COST_RATE_GAS,
} from "@/lib/config/emissions";

// Unit conversion constants
export { GJ_M2_TO_KWH_SQFT, KWH_SQFT_TO_GJ_M2 } from "@/lib/config/building-types";
