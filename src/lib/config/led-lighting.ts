/**
 * LED Lighting Retrofit — Configuration Data
 *
 * All configurable values for the LED measure card.
 * Lighting shares, cost ranges, savings percentages, incentive parameters.
 *
 * Sources:
 *   - NRCan MERG — lighting share by building type
 *   - SCIEU 2019 — end-use energy breakdown
 *   - SaveOnEnergy Retrofit Program (June 2025)
 *   - Industry cost data (Canadian commercial, 2024–2025)
 */

// ---------------------------------------------------------------------------
// Lighting Type Enum
// ---------------------------------------------------------------------------

export type LightingType =
  | "fluorescent_t12"
  | "fluorescent_t8"
  | "hid"
  | "mixed"
  | "unknown"
  | "led";

// ---------------------------------------------------------------------------
// Lighting Technology Config
// ---------------------------------------------------------------------------

export interface LightingTechnologyConfig {
  lightingType: LightingType;
  displayName: string;
  savingsVsLedPct: number;
  hidLightingShareAdjustment: number;
}

export const LIGHTING_TECHNOLOGY_CONFIGS: LightingTechnologyConfig[] = [
  {
    lightingType: "fluorescent_t12",
    displayName: "Fluorescent (T12)",
    savingsVsLedPct: 0.60,
    hidLightingShareAdjustment: 0,
  },
  {
    lightingType: "fluorescent_t8",
    displayName: "Fluorescent (T8/T5)",
    savingsVsLedPct: 0.40,
    hidLightingShareAdjustment: 0,
  },
  {
    lightingType: "hid",
    displayName: "HID (Metal Halide / HPS)",
    savingsVsLedPct: 0.60,
    hidLightingShareAdjustment: 0.10,
  },
  {
    lightingType: "mixed",
    displayName: "Mixed (various types)",
    savingsVsLedPct: 0.35,
    hidLightingShareAdjustment: 0,
  },
  {
    lightingType: "unknown",
    displayName: "Unknown",
    savingsVsLedPct: 0.35,
    hidLightingShareAdjustment: 0,
  },
  {
    lightingType: "led",
    displayName: "LED (already upgraded)",
    savingsVsLedPct: 0,
    hidLightingShareAdjustment: 0,
  },
];

export function getLightingTechConfig(
  lightingType: LightingType
): LightingTechnologyConfig {
  return (
    LIGHTING_TECHNOLOGY_CONFIGS.find(
      (c) => c.lightingType === lightingType
    ) ?? LIGHTING_TECHNOLOGY_CONFIGS.find((c) => c.lightingType === "unknown")!
  );
}

// ---------------------------------------------------------------------------
// Lighting Share + Cost by Building Type
// ---------------------------------------------------------------------------

export interface LedBuildingConfig {
  buildingTypeId: string;
  lightingSharePct: number;
  costMidpointPerSqft: number;
  costUpperPerSqft: number;
  measureApplicable: boolean;
  measureNote: string | null;
}

export const LED_BUILDING_CONFIGS: LedBuildingConfig[] = [
  { buildingTypeId: "office", lightingSharePct: 0.30, costMidpointPerSqft: 2.00, costUpperPerSqft: 3.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "warehouse", lightingSharePct: 0.20, costMidpointPerSqft: 1.50, costUpperPerSqft: 3.00, measureApplicable: true, measureNote: null },
  { buildingTypeId: "warehouse_cold", lightingSharePct: 0.14, costMidpointPerSqft: 2.00, costUpperPerSqft: 3.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "manufacturing", lightingSharePct: 0.15, costMidpointPerSqft: 1.50, costUpperPerSqft: 3.00, measureApplicable: true, measureNote: null },
  { buildingTypeId: "manufacturing_food", lightingSharePct: 0.12, costMidpointPerSqft: 2.00, costUpperPerSqft: 3.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "retail", lightingSharePct: 0.35, costMidpointPerSqft: 2.50, costUpperPerSqft: 4.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "restaurant", lightingSharePct: 0.12, costMidpointPerSqft: 2.50, costUpperPerSqft: 4.00, measureApplicable: true, measureNote: null },
  { buildingTypeId: "medical_office", lightingSharePct: 0.20, costMidpointPerSqft: 2.50, costUpperPerSqft: 4.00, measureApplicable: true, measureNote: null },
  { buildingTypeId: "school", lightingSharePct: 0.30, costMidpointPerSqft: 2.00, costUpperPerSqft: 3.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "data_center", lightingSharePct: 0.03, costMidpointPerSqft: 1.00, costUpperPerSqft: 2.00, measureApplicable: true, measureNote: "Lighting is a small fraction of your energy use. Other efficiency measures will have greater impact for this building type." },
  { buildingTypeId: "agriculture", lightingSharePct: 0.10, costMidpointPerSqft: 1.00, costUpperPerSqft: 2.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "greenhouse", lightingSharePct: 0.45, costMidpointPerSqft: 0, costUpperPerSqft: 0, measureApplicable: false, measureNote: "Specialized horticultural lighting requires a different approach. Contact a horticultural lighting specialist. SaveOnEnergy offers greenhouse-specific measures." },
  { buildingTypeId: "multifamily", lightingSharePct: 0.25, costMidpointPerSqft: 2.00, costUpperPerSqft: 3.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "hotel", lightingSharePct: 0.20, costMidpointPerSqft: 2.50, costUpperPerSqft: 4.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "grocery", lightingSharePct: 0.20, costMidpointPerSqft: 2.00, costUpperPerSqft: 3.50, measureApplicable: true, measureNote: null },
  { buildingTypeId: "other", lightingSharePct: 0.25, costMidpointPerSqft: 2.00, costUpperPerSqft: 3.50, measureApplicable: true, measureNote: null },
];

export function getLedBuildingConfig(buildingTypeId: string): LedBuildingConfig {
  return (
    LED_BUILDING_CONFIGS.find((c) => c.buildingTypeId === buildingTypeId) ??
    LED_BUILDING_CONFIGS.find((c) => c.buildingTypeId === "other")!
  );
}

// HID-eligible building types for lighting share adjustment
const HID_ADJUSTMENT_TYPES = ["warehouse", "warehouse_cold", "manufacturing"];

export function isHidAdjustmentEligible(buildingTypeId: string): boolean {
  return HID_ADJUSTMENT_TYPES.includes(buildingTypeId);
}

// ---------------------------------------------------------------------------
// SaveOnEnergy Incentive Config
// ---------------------------------------------------------------------------

/** $/kWh saved — SaveOnEnergy Custom stream (June 2025) */
export const SOE_CUSTOM_INCENTIVE_RATE = 0.20;

/** Cap: 50% of eligible project costs */
export const SOE_INCENTIVE_CAP_PCT = 0.50;

/** Regional adder multiplier for grid-constrained areas (future enhancement) */
export const SOE_REGIONAL_ADDER_MULTIPLIER = 2.0;

// ---------------------------------------------------------------------------
// Financial Defaults (shared across all measure cards)
// ---------------------------------------------------------------------------

/** NPV discount rate — disclosed in footnote */
export const NPV_DISCOUNT_RATE = 0.06;

/** NPV analysis period in years */
export const NPV_ANALYSIS_PERIOD_YEARS = 10;

/** Rate escalation scenarios (matches rate framework approved decision #3) */
export const RATE_ESCALATION_CONSERVATIVE = 0.02;
export const RATE_ESCALATION_BASE = 0.025;
export const RATE_ESCALATION_HIGH = 0.045;

/** Demand savings diversity factor — fraction of lighting at peak */
export const DEMAND_SAVINGS_DIVERSITY_FACTOR = 0.80;

// ---------------------------------------------------------------------------
// Confidence Level Thresholds
// ---------------------------------------------------------------------------

export type LedConfidence = "green" | "yellow" | "red";

/** Savings threshold below which we flag the card */
export const LOW_SAVINGS_THRESHOLD_DOLLARS = 500;

/** Payback threshold above which we flag RED */
export const HIGH_PAYBACK_THRESHOLD_YEARS = 10;

/** Small building threshold for DIY note */
export const SMALL_BUILDING_THRESHOLD_SQFT = 5000;
