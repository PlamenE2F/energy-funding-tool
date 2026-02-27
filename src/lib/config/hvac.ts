/**
 * HVAC Upgrades — Configuration Data
 *
 * All configurable values for the HVAC measure card.
 * HVAC shares by building type, COP values, cost tables, scenario matrix,
 * fuel switching parameters, and incentive config.
 *
 * Sources:
 *   - NRCan CCHT cold-climate data, Region V HSPF
 *   - ACEEE (2024) Cold Climate Heat Pumps in the Field
 *   - CBECS 2018 end-use breakdown by building type
 *   - ASHRAE 90.1 reference COP values
 *   - SaveOnEnergy Custom stream (2025/2026)
 *   - Enbridge Gas Commercial Custom Retrofit (2026)
 *   - CRA Clean Technology ITC (2023–2034)
 *   - NRCan Oil-to-Heat-Pump Affordability Program
 *   - Industry cost data (commercial HVAC benchmarks)
 */

// ---------------------------------------------------------------------------
// Fuel Source Type
// ---------------------------------------------------------------------------

export type FuelSource =
  | "natural_gas"
  | "oil"
  | "propane"
  | "electric_only"
  | "other";

// ---------------------------------------------------------------------------
// HVAC Age Category
// ---------------------------------------------------------------------------

export type HvacAge =
  | "under_5"
  | "5_to_10"
  | "10_to_20"
  | "over_20";

// ---------------------------------------------------------------------------
// HVAC Scenario IDs
// ---------------------------------------------------------------------------

export type HvacScenarioId =
  | "HE-01"
  | "HE-02"
  | "HE-03"
  | "HE-04"
  | "HE-05"
  | "HE-06"
  | "HE-07";

// ---------------------------------------------------------------------------
// Scenario Matrix [CONFIG]
// ---------------------------------------------------------------------------

export interface HvacScenario {
  scenarioId: HvacScenarioId;
  displayName: string;
  description: string;
  fuelSource: FuelSource[];
  isFuelSwitching: boolean;
  hasCombinedPathway: boolean;
  isGasEfficiency: boolean;
  isElectricEfficiency: boolean;
  isCoolingOnly: boolean;
}

export const HVAC_SCENARIOS: HvacScenario[] = [
  {
    scenarioId: "HE-01",
    displayName: "High-Efficiency Condensing Gas",
    description: "Gas furnace/boiler (80%) → Condensing (95%)",
    fuelSource: ["natural_gas"],
    isFuelSwitching: false,
    hasCombinedPathway: false,
    isGasEfficiency: true,
    isElectricEfficiency: false,
    isCoolingOnly: false,
  },
  {
    scenarioId: "HE-02",
    displayName: "Heat Pump Conversion",
    description: "Gas furnace/boiler → Air-Source Heat Pump",
    fuelSource: ["natural_gas"],
    isFuelSwitching: true,
    hasCombinedPathway: true,
    isGasEfficiency: false,
    isElectricEfficiency: false,
    isCoolingOnly: false,
  },
  {
    scenarioId: "HE-03",
    displayName: "Ground-Source Heat Pump",
    description: "Gas furnace/boiler → Ground-Source Heat Pump",
    fuelSource: ["natural_gas"],
    isFuelSwitching: true,
    hasCombinedPathway: true,
    isGasEfficiency: false,
    isElectricEfficiency: false,
    isCoolingOnly: false,
  },
  {
    scenarioId: "HE-04",
    displayName: "Oil to Heat Pump",
    description: "Oil furnace/boiler → Air-Source Heat Pump",
    fuelSource: ["oil"],
    isFuelSwitching: true,
    hasCombinedPathway: true,
    isGasEfficiency: false,
    isElectricEfficiency: false,
    isCoolingOnly: false,
  },
  {
    scenarioId: "HE-05",
    displayName: "Propane to Heat Pump",
    description: "Propane furnace → Air-Source Heat Pump",
    fuelSource: ["propane"],
    isFuelSwitching: true,
    hasCombinedPathway: true,
    isGasEfficiency: false,
    isElectricEfficiency: false,
    isCoolingOnly: false,
  },
  {
    scenarioId: "HE-06",
    displayName: "Electric Heat Pump Upgrade",
    description: "Electric resistance → Heat Pump",
    fuelSource: ["electric_only"],
    isFuelSwitching: false,
    hasCombinedPathway: false,
    isGasEfficiency: false,
    isElectricEfficiency: true,
    isCoolingOnly: false,
  },
  {
    scenarioId: "HE-07",
    displayName: "Cooling Efficiency Upgrade",
    description: "Old RTU (SEER 10–12) → High-eff RTU (SEER 16–18)",
    fuelSource: ["natural_gas", "oil", "propane", "electric_only", "other"],
    isFuelSwitching: false,
    hasCombinedPathway: false,
    isGasEfficiency: false,
    isElectricEfficiency: true,
    isCoolingOnly: true,
  },
];

export function getHvacScenario(scenarioId: HvacScenarioId): HvacScenario {
  return HVAC_SCENARIOS.find((s) => s.scenarioId === scenarioId)!;
}

// ---------------------------------------------------------------------------
// HVAC Building Type Config [CONFIG]
// ---------------------------------------------------------------------------

export interface HvacBuildingConfig {
  buildingTypeId: string;
  hvacElectricPct: number;
  hvacGasPct: number;
  hvacMeasureApplicable: boolean;
  hvacMeasureNote: string | null;
}

export const HVAC_BUILDING_CONFIGS: HvacBuildingConfig[] = [
  { buildingTypeId: "office", hvacElectricPct: 0.30, hvacGasPct: 0.85, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "warehouse", hvacElectricPct: 0.15, hvacGasPct: 0.90, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "warehouse_cold", hvacElectricPct: 0.50, hvacGasPct: 0.80, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "manufacturing", hvacElectricPct: 0.25, hvacGasPct: 0.75, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "manufacturing_food", hvacElectricPct: 0.35, hvacGasPct: 0.55, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "retail", hvacElectricPct: 0.30, hvacGasPct: 0.85, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "restaurant", hvacElectricPct: 0.20, hvacGasPct: 0.40, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "medical_office", hvacElectricPct: 0.35, hvacGasPct: 0.70, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "school", hvacElectricPct: 0.25, hvacGasPct: 0.85, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "data_center", hvacElectricPct: 0.35, hvacGasPct: 0.10, hvacMeasureApplicable: true, hvacMeasureNote: "Data center HVAC is cooling-dominated. A Tier 3 analysis with specialized cooling engineering is recommended." },
  { buildingTypeId: "agriculture", hvacElectricPct: 0.20, hvacGasPct: 0.80, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "greenhouse", hvacElectricPct: 0.30, hvacGasPct: 0.90, hvacMeasureApplicable: true, hvacMeasureNote: "Greenhouse HVAC requires crop-specific analysis. Standard calculations may not reflect actual heating/cooling requirements." },
  { buildingTypeId: "multifamily", hvacElectricPct: 0.20, hvacGasPct: 0.65, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "hotel", hvacElectricPct: 0.30, hvacGasPct: 0.60, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "grocery", hvacElectricPct: 0.15, hvacGasPct: 0.80, hvacMeasureApplicable: true, hvacMeasureNote: null },
  { buildingTypeId: "other", hvacElectricPct: 0.25, hvacGasPct: 0.75, hvacMeasureApplicable: true, hvacMeasureNote: null },
];

export function getHvacBuildingConfig(buildingTypeId: string): HvacBuildingConfig {
  return (
    HVAC_BUILDING_CONFIGS.find((c) => c.buildingTypeId === buildingTypeId) ??
    HVAC_BUILDING_CONFIGS.find((c) => c.buildingTypeId === "other")!
  );
}

// ---------------------------------------------------------------------------
// HVAC Defaults [CONFIG]
// ---------------------------------------------------------------------------

/** Existing gas/oil/propane furnace/boiler efficiency (conservative) */
export const EXISTING_FURNACE_EFFICIENCY = 0.80;

/** Existing boiler efficiency */
export const EXISTING_BOILER_EFFICIENCY = 0.80;

/** Existing RTU SEER (systems > 10 years old) */
export const EXISTING_RTU_SEER = 10;

/** New high-efficiency RTU SEER */
export const NEW_RTU_SEER = 17;

/** New condensing efficiency per Amendment 15 */
export const NEW_CONDENSING_EFFICIENCY = 0.95;

/** Gas savings pct for HE-01: 1 - 0.80/0.95 = 15.8%, rounded to 16% */
export const GAS_SAVINGS_PCT_HE01 = 0.16;

/** Conservative cooling savings pct for SEER 10→17 */
export const COOLING_SAVINGS_PCT = 0.35;

/** Cooling share of HVAC electricity — Ontario dual-climate default */
export const COOLING_SHARE_OF_HVAC_ELECTRIC = 0.50;

/** Heating share of HVAC electricity — Ontario dual-climate default */
export const HEATING_SHARE_OF_HVAC_ELECTRIC = 0.50;

/** Peak coincidence factor for cooling demand calculation */
export const COOLING_DIVERSITY_FACTOR = 0.70;

/** Ontario cooling season hours */
export const TYPICAL_COOLING_HOURS = 1200;

// ---------------------------------------------------------------------------
// Seasonal COP Values [CONFIG]
// ---------------------------------------------------------------------------

/** ASHP seasonal COP — NRCan CCHT data, Region V HSPF, defrost-adjusted */
export const SEASONAL_COP_ASHP = 2.8;

/** GSHP seasonal COP — ASHRAE 90.1 reference, ground-temperature stable */
export const SEASONAL_COP_GSHP = 3.8;

// ---------------------------------------------------------------------------
// Fuel Rate Defaults [CONFIG]
// ---------------------------------------------------------------------------

/** Ontario commercial gas rate ($/m³) — conservative, commodity + delivery */
export const GAS_RATE_DEFAULT = 0.30;

/** Gas rate for back-solving m³ from $ */
export const GAS_RATE_BACKSOLVE = 0.35;

/** Oil rate ($/litre) */
export const OIL_RATE_DEFAULT = 1.40;

/** Propane rate ($/litre) */
export const PROPANE_RATE_DEFAULT = 0.90;

// ---------------------------------------------------------------------------
// Fuel Energy Content [CONFIG]
// ---------------------------------------------------------------------------

/** Gas: kWh per m³ (HHV) — NOT 10.36 */
export const GAS_KWH_PER_M3 = 10.55;

/** Oil: kWh per litre (HHV) */
export const OIL_KWH_PER_LITRE = 10.74;

/** Propane: kWh per litre (HHV) */
export const PROPANE_KWH_PER_LITRE = 7.08;

/** Oil furnace efficiency */
export const OIL_FURNACE_EFFICIENCY = 0.80;

/** Propane furnace efficiency */
export const PROPANE_FURNACE_EFFICIENCY = 0.80;

// ---------------------------------------------------------------------------
// Cost Tables [CONFIG]
// ---------------------------------------------------------------------------

export type SizeCategory = "small" | "medium" | "large";

export interface HvacCostConfig {
  scenarioId: HvacScenarioId;
  sizeCategory: SizeCategory;
  costPerSqftMidpoint: number;
  costPerSqftUpper: number;
  minimumCostFloor: number;
}

export const SIZE_THRESHOLD_SMALL = 10_000;
export const SIZE_THRESHOLD_LARGE = 50_000;

export const HVAC_COST_CONFIGS: HvacCostConfig[] = [
  // HE-01: Gas → Condensing Gas
  { scenarioId: "HE-01", sizeCategory: "small", costPerSqftMidpoint: 6.00, costPerSqftUpper: 10.00, minimumCostFloor: 15_000 },
  { scenarioId: "HE-01", sizeCategory: "medium", costPerSqftMidpoint: 5.00, costPerSqftUpper: 8.00, minimumCostFloor: 15_000 },
  { scenarioId: "HE-01", sizeCategory: "large", costPerSqftMidpoint: 4.00, costPerSqftUpper: 6.00, minimumCostFloor: 15_000 },

  // HE-02/04/05: Combustion → ASHP (fuel switching)
  { scenarioId: "HE-02", sizeCategory: "small", costPerSqftMidpoint: 15.00, costPerSqftUpper: 22.00, minimumCostFloor: 25_000 },
  { scenarioId: "HE-02", sizeCategory: "medium", costPerSqftMidpoint: 12.00, costPerSqftUpper: 20.00, minimumCostFloor: 25_000 },
  { scenarioId: "HE-02", sizeCategory: "large", costPerSqftMidpoint: 10.00, costPerSqftUpper: 16.00, minimumCostFloor: 25_000 },

  { scenarioId: "HE-04", sizeCategory: "small", costPerSqftMidpoint: 15.00, costPerSqftUpper: 22.00, minimumCostFloor: 25_000 },
  { scenarioId: "HE-04", sizeCategory: "medium", costPerSqftMidpoint: 12.00, costPerSqftUpper: 20.00, minimumCostFloor: 25_000 },
  { scenarioId: "HE-04", sizeCategory: "large", costPerSqftMidpoint: 10.00, costPerSqftUpper: 16.00, minimumCostFloor: 25_000 },

  { scenarioId: "HE-05", sizeCategory: "small", costPerSqftMidpoint: 15.00, costPerSqftUpper: 22.00, minimumCostFloor: 25_000 },
  { scenarioId: "HE-05", sizeCategory: "medium", costPerSqftMidpoint: 12.00, costPerSqftUpper: 20.00, minimumCostFloor: 25_000 },
  { scenarioId: "HE-05", sizeCategory: "large", costPerSqftMidpoint: 10.00, costPerSqftUpper: 16.00, minimumCostFloor: 25_000 },

  // HE-03: Gas → GSHP
  { scenarioId: "HE-03", sizeCategory: "small", costPerSqftMidpoint: 22.00, costPerSqftUpper: 30.00, minimumCostFloor: 50_000 },
  { scenarioId: "HE-03", sizeCategory: "medium", costPerSqftMidpoint: 18.00, costPerSqftUpper: 25.00, minimumCostFloor: 50_000 },
  { scenarioId: "HE-03", sizeCategory: "large", costPerSqftMidpoint: 15.00, costPerSqftUpper: 22.00, minimumCostFloor: 50_000 },

  // HE-06: Electric Resistance → Heat Pump
  { scenarioId: "HE-06", sizeCategory: "small", costPerSqftMidpoint: 10.00, costPerSqftUpper: 15.00, minimumCostFloor: 20_000 },
  { scenarioId: "HE-06", sizeCategory: "medium", costPerSqftMidpoint: 8.00, costPerSqftUpper: 12.00, minimumCostFloor: 20_000 },
  { scenarioId: "HE-06", sizeCategory: "large", costPerSqftMidpoint: 6.00, costPerSqftUpper: 10.00, minimumCostFloor: 20_000 },

  // HE-07: RTU Replacement (cooling efficiency)
  { scenarioId: "HE-07", sizeCategory: "small", costPerSqftMidpoint: 6.00, costPerSqftUpper: 10.00, minimumCostFloor: 15_000 },
  { scenarioId: "HE-07", sizeCategory: "medium", costPerSqftMidpoint: 5.00, costPerSqftUpper: 8.00, minimumCostFloor: 15_000 },
  { scenarioId: "HE-07", sizeCategory: "large", costPerSqftMidpoint: 4.00, costPerSqftUpper: 6.00, minimumCostFloor: 15_000 },
];

export function getSizeCategory(buildingSizeSqft: number): SizeCategory {
  if (buildingSizeSqft < SIZE_THRESHOLD_SMALL) return "small";
  if (buildingSizeSqft > SIZE_THRESHOLD_LARGE) return "large";
  return "medium";
}

export function getHvacCostConfig(
  scenarioId: HvacScenarioId,
  sizeCategory: SizeCategory
): HvacCostConfig {
  return HVAC_COST_CONFIGS.find(
    (c) => c.scenarioId === scenarioId && c.sizeCategory === sizeCategory
  )!;
}

// ---------------------------------------------------------------------------
// Confidence Thresholds
// ---------------------------------------------------------------------------

export type HvacConfidence = "green" | "yellow" | "red";

/** Payback threshold for flagging */
export const HIGH_PAYBACK_THRESHOLD_YEARS = 25;

/** Small building threshold */
export const SMALL_BUILDING_THRESHOLD_SQFT = 5000;

// ---------------------------------------------------------------------------
// Fallback Rate
// ---------------------------------------------------------------------------

/** Fallback electricity rate when rate framework unavailable */
export const FALLBACK_ELECTRICITY_RATE = 0.13;
