/**
 * Ontario Electricity Rate Configuration Data
 *
 * All configurable values for Ontario rate classification.
 * In production, these are stored in database config tables.
 * This module provides the seed data and serves as a typed reference.
 *
 * Sources:
 *   - OEB RPP rates effective November 1, 2025
 *   - Toronto Hydro business rates effective January 1, 2026
 *   - IESO Global Adjustment and Class A eligibility rules
 */

import type {
  JurisdictionConfig,
  RateClassConfig,
  TouPeriodConfig,
  LoadFactorEntry,
  RateEscalationScenarios,
  BuildingType,
} from "@/lib/rates/types";

// ---------------------------------------------------------------------------
// Jurisdiction Config
// ---------------------------------------------------------------------------

export const ONTARIO_JURISDICTION: JurisdictionConfig = {
  jurisdictionId: "ON",
  jurisdictionName: "Ontario",
  country: "CA",
  currency: "CAD",
  areaUnit: "sqft",
  energyUnit: "kWh",
  gasUnit: "m3",
  taxRate: 0.13, // HST
  rebateName: "Ontario Electricity Rebate",
  rebateRate: 0.235, // 23.5%
  rebateEligibleClasses: ["rpp_tou", "rpp_ulo", "rpp_tiered"],
  effectiveDate: "2025-11-01",
};

// ---------------------------------------------------------------------------
// Rate Class Configs
// ---------------------------------------------------------------------------

export const ONTARIO_RATE_CLASSES: RateClassConfig[] = [
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_tou",
    rateClassName: "RPP — Time-of-Use",
    peakDemandMinKw: null,
    peakDemandMaxKw: 50,
    annualKwhMin: null,
    annualKwhMax: null,
    hasDemandCharges: false,
    hasTemporalPricing: true,
    hasSeparateGa: false,
    defaultEffectiveRate: 0.155,
    defaultEnergyRate: 0.155,
    demandChargeRate: null,
    effectiveDate: "2025-11-01",
    sourceReference: "OEB RPP TOU rates effective Nov 1, 2025",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_ulo",
    rateClassName: "RPP — Ultra-Low Overnight",
    peakDemandMinKw: null,
    peakDemandMaxKw: 50,
    annualKwhMin: null,
    annualKwhMax: null,
    hasDemandCharges: false,
    hasTemporalPricing: true,
    hasSeparateGa: false,
    defaultEffectiveRate: 0.145,
    defaultEnergyRate: 0.145,
    demandChargeRate: null,
    effectiveDate: "2025-11-01",
    sourceReference: "OEB RPP ULO rates effective Nov 1, 2025",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_tiered",
    rateClassName: "RPP — Tiered",
    peakDemandMinKw: null,
    peakDemandMaxKw: 50,
    annualKwhMin: null,
    annualKwhMax: null,
    hasDemandCharges: false,
    hasTemporalPricing: false,
    hasSeparateGa: false,
    defaultEffectiveRate: 0.15,
    defaultEnergyRate: 0.15,
    demandChargeRate: null,
    effectiveDate: "2025-11-01",
    sourceReference: "OEB RPP Tiered rates effective Nov 1, 2025",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_class_b_50_999",
    rateClassName: "Class B (50–999 kW)",
    peakDemandMinKw: 50,
    peakDemandMaxKw: 999,
    annualKwhMin: null,
    annualKwhMax: null,
    hasDemandCharges: true,
    hasTemporalPricing: false,
    hasSeparateGa: true,
    defaultEffectiveRate: 0.13,
    defaultEnergyRate: 0.105,
    demandChargeRate: 17.84, // Toronto Hydro GS 50–999 kW baseline
    effectiveDate: "2026-01-01",
    sourceReference: "Toronto Hydro GS 50–999 kW rates effective Jan 1, 2026",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_class_b_1000_4999",
    rateClassName: "Class B (1,000–4,999 kW)",
    peakDemandMinKw: 1000,
    peakDemandMaxKw: 4999,
    annualKwhMin: null,
    annualKwhMax: null,
    hasDemandCharges: true,
    hasTemporalPricing: false,
    hasSeparateGa: true,
    defaultEffectiveRate: 0.12,
    defaultEnergyRate: 0.095,
    demandChargeRate: 15.9, // Toronto Hydro GS 1,000–4,999 kW
    effectiveDate: "2026-01-01",
    sourceReference:
      "Toronto Hydro GS 1,000–4,999 kW rates effective Jan 1, 2026",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_class_a",
    rateClassName: "Class A",
    peakDemandMinKw: 1000,
    peakDemandMaxKw: null,
    annualKwhMin: null,
    annualKwhMax: null,
    hasDemandCharges: true,
    hasTemporalPricing: false,
    hasSeparateGa: true,
    defaultEffectiveRate: 0.095,
    defaultEnergyRate: 0.075,
    demandChargeRate: 17.84,
    effectiveDate: "2026-01-01",
    sourceReference: "IESO Class A eligibility and GA methodology",
  },
];

// ---------------------------------------------------------------------------
// TOU Period Configs (OEB rates effective Nov 1, 2025)
// ---------------------------------------------------------------------------

export const ONTARIO_TOU_PERIODS: TouPeriodConfig[] = [
  // ---- TOU Winter (Nov 1 – Apr 30) ----
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_tou",
    season: "winter",
    seasonStart: "Nov 1",
    seasonEnd: "Apr 30",
    periodName: "off_peak",
    weekdayHours: [{ start: "19:00", end: "07:00" }],
    weekendHours: [{ start: "00:00", end: "24:00" }],
    ratePerKwh: 0.098,
    effectiveDate: "2025-11-01",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_tou",
    season: "winter",
    seasonStart: "Nov 1",
    seasonEnd: "Apr 30",
    periodName: "mid_peak",
    weekdayHours: [{ start: "11:00", end: "17:00" }],
    weekendHours: null,
    ratePerKwh: 0.157,
    effectiveDate: "2025-11-01",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_tou",
    season: "winter",
    seasonStart: "Nov 1",
    seasonEnd: "Apr 30",
    periodName: "on_peak",
    weekdayHours: [
      { start: "07:00", end: "11:00" },
      { start: "17:00", end: "19:00" },
    ],
    weekendHours: null,
    ratePerKwh: 0.203,
    effectiveDate: "2025-11-01",
  },

  // ---- TOU Summer (May 1 – Oct 31) ----
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_tou",
    season: "summer",
    seasonStart: "May 1",
    seasonEnd: "Oct 31",
    periodName: "off_peak",
    weekdayHours: [{ start: "19:00", end: "07:00" }],
    weekendHours: [{ start: "00:00", end: "24:00" }],
    ratePerKwh: 0.098,
    effectiveDate: "2025-11-01",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_tou",
    season: "summer",
    seasonStart: "May 1",
    seasonEnd: "Oct 31",
    periodName: "mid_peak",
    weekdayHours: [
      { start: "07:00", end: "11:00" },
      { start: "17:00", end: "19:00" },
    ],
    weekendHours: null,
    ratePerKwh: 0.157,
    effectiveDate: "2025-11-01",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_tou",
    season: "summer",
    seasonStart: "May 1",
    seasonEnd: "Oct 31",
    periodName: "on_peak",
    weekdayHours: [{ start: "11:00", end: "17:00" }],
    weekendHours: null,
    ratePerKwh: 0.203,
    effectiveDate: "2025-11-01",
  },

  // ---- ULO (year-round) ----
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_ulo",
    season: "year_round",
    seasonStart: null,
    seasonEnd: null,
    periodName: "ultra_low_overnight",
    weekdayHours: [{ start: "23:00", end: "07:00" }],
    weekendHours: [{ start: "23:00", end: "07:00" }],
    ratePerKwh: 0.039,
    effectiveDate: "2025-11-01",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_ulo",
    season: "year_round",
    seasonStart: null,
    seasonEnd: null,
    periodName: "weekend_off_peak",
    weekdayHours: [],
    weekendHours: [{ start: "07:00", end: "23:00" }],
    ratePerKwh: 0.098,
    effectiveDate: "2025-11-01",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_ulo",
    season: "year_round",
    seasonStart: null,
    seasonEnd: null,
    periodName: "mid_peak",
    weekdayHours: [
      { start: "07:00", end: "16:00" },
      { start: "21:00", end: "23:00" },
    ],
    weekendHours: null,
    ratePerKwh: 0.157,
    effectiveDate: "2025-11-01",
  },
  {
    jurisdictionId: "ON",
    rateClassId: "on_rpp_ulo",
    season: "year_round",
    seasonStart: null,
    seasonEnd: null,
    periodName: "on_peak",
    weekdayHours: [{ start: "16:00", end: "21:00" }],
    weekendHours: null,
    ratePerKwh: 0.391,
    effectiveDate: "2025-11-01",
  },
];

// ---------------------------------------------------------------------------
// Load Factors by Building Type
// ---------------------------------------------------------------------------

export const LOAD_FACTORS: LoadFactorEntry[] = [
  { buildingType: "office", loadFactor: 0.45, source: "Data Point Spec v1.2" },
  { buildingType: "retail", loadFactor: 0.4, source: "Data Point Spec v1.2" },
  {
    buildingType: "restaurant",
    loadFactor: 0.45,
    source: "Data Point Spec v1.2",
  },
  { buildingType: "grocery", loadFactor: 0.55, source: "Data Point Spec v1.2" },
  {
    buildingType: "warehouse",
    loadFactor: 0.35,
    source: "Data Point Spec v1.2",
  },
  { buildingType: "school", loadFactor: 0.3, source: "Data Point Spec v1.2" },
  {
    buildingType: "university",
    loadFactor: 0.45,
    source: "Data Point Spec v1.2",
  },
  {
    buildingType: "hospital",
    loadFactor: 0.6,
    source: "Data Point Spec v1.2",
  },
  {
    buildingType: "medical_office",
    loadFactor: 0.4,
    source: "Data Point Spec v1.2",
  },
  { buildingType: "hotel", loadFactor: 0.5, source: "Data Point Spec v1.2" },
  {
    buildingType: "multifamily",
    loadFactor: 0.45,
    source: "Data Point Spec v1.2",
  },
  { buildingType: "worship", loadFactor: 0.2, source: "Data Point Spec v1.2" },
  { buildingType: "arena", loadFactor: 0.3, source: "Data Point Spec v1.2" },
  {
    buildingType: "manufacturing",
    loadFactor: 0.55,
    source: "Data Point Spec v1.2",
  },
  {
    buildingType: "greenhouse",
    loadFactor: 0.5,
    source: "Data Point Spec v1.2",
  },
  { buildingType: "other", loadFactor: 0.4, source: "Data Point Spec v1.2" },
];

// ---------------------------------------------------------------------------
// Rate Escalation Scenarios (approved decision #3)
// ---------------------------------------------------------------------------

export const RATE_ESCALATION: RateEscalationScenarios = {
  conservative: 0.02,
  baseCase: 0.025,
  highGrowth: 0.045,
};

// ---------------------------------------------------------------------------
// Key Parameters
// ---------------------------------------------------------------------------

/** Mid-range Ontario demand charge estimate ($/kW/month) */
export const DEMAND_CHARGE_DEFAULT = 11.0;

/** Full demand charge — Toronto Hydro GS 50–999 kW ($/kW/month) */
export const DEMAND_CHARGE_TORONTO_HYDRO_50_999 = 17.84;

/** OEB scheduled rate review dates */
export const OEB_RATE_REVIEW_DATES = ["May 1", "Nov 1"];

/** RPP Tiered thresholds */
export const TIERED_THRESHOLD_KWH_PER_MONTH = 750;
export const TIERED_RATE_1 = 0.12; // $/kWh
export const TIERED_RATE_2 = 0.142; // $/kWh

// ---------------------------------------------------------------------------
// Regulatory Charges
// ---------------------------------------------------------------------------

export const WHOLESALE_MARKET_SERVICE_RATE = 0.0047; // $/kWh
export const CAPACITY_BASED_RECOVERY_RATE = 0.0006; // $/kWh (Class B only)

// ---------------------------------------------------------------------------
// Delivery Rates (Toronto Hydro, effective Jan 1, 2026)
// ---------------------------------------------------------------------------

export const DELIVERY_RATES = {
  gs_under_50: {
    customerCharge: 43.7, // $/30 days
    distributionRate: 0.04778, // $/kWh
    transmissionRate: 0.02111, // $/kWh
  },
  gs_50_999: {
    customerCharge: 64.3, // $/30 days
    distributionRate: 10.517, // $/kVA/30 days
    transmissionConnection: 2.8938, // $/kW/month
    transmissionNetwork: 4.4306, // $/kW/month
  },
  gs_1000_4999: {
    customerCharge: 1094.15, // $/30 days
    distributionRate: 8.7311, // $/kVA/30 days
    transmissionConnection: 2.8908, // $/kW/month
    transmissionNetwork: 4.2809, // $/kW/month
  },
  gs_over_5000: {
    customerCharge: 4843.52, // $/30 days
    distributionRate: 9.4416, // $/kVA/30 days
    transmissionConnection: 3.2117, // $/kW/month
    transmissionNetwork: 4.8799, // $/kW/month
  },
};

// ---------------------------------------------------------------------------
// Effective Rate Validation Ranges
// ---------------------------------------------------------------------------

export const EFFECTIVE_RATE_RANGES: Record<
  string,
  { min: number; max: number }
> = {
  rpp: { min: 0.12, max: 0.2 },
  class_b: { min: 0.1, max: 0.16 },
  class_a: { min: 0.08, max: 0.14 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up load factor for a given building type */
export function getLoadFactor(buildingType: BuildingType): number {
  const entry = LOAD_FACTORS.find((lf) => lf.buildingType === buildingType);
  // Default to 0.4 if building type not found
  return entry?.loadFactor ?? 0.4;
}

/** Look up rate class config by ID */
export function getRateClassConfig(
  rateClassId: string
): RateClassConfig | undefined {
  return ONTARIO_RATE_CLASSES.find((rc) => rc.rateClassId === rateClassId);
}

/** Get all rate class configs for a jurisdiction */
export function getRateClassesForJurisdiction(
  jurisdictionId: string
): RateClassConfig[] {
  return ONTARIO_RATE_CLASSES.filter(
    (rc) => rc.jurisdictionId === jurisdictionId
  );
}

/** Check if a rate class is RPP (Regulated Price Plan) */
export function isRppClass(rateClassId: string): boolean {
  return rateClassId.includes("rpp");
}
