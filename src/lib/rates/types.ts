/**
 * VoltMatch Rate Classification Framework — Type Definitions
 *
 * All types for the Ontario electricity rate classification engine.
 * This module defines the data structures used throughout the rate framework.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Rate class assigned to a building based on peak demand and billing structure */
export type RateClass =
  | "rpp_tou"
  | "rpp_ulo"
  | "rpp_tiered"
  | "class_b"
  | "class_a"
  | "unknown";

/** How the rate class was determined */
export type RateClassSource = "estimated" | "user_declared" | "bill_verified";

/** Confidence level in the rate class assignment */
export type RateClassConfidence = "high" | "medium" | "low";

/** How the effective rate was determined */
export type EffectiveRateSource =
  | "user_derived"
  | "class_default"
  | "tou_adjusted"
  | "bill_verified";

/** User-facing rate structure dropdown options */
export type RateStructureOption =
  | "rpp_tou"
  | "rpp_ulo"
  | "rpp_tiered"
  | "spot_market"
  | "retailer_contract"
  | "dont_know";

/** Ontario bill seasons for TOU period definitions */
export type Season = "winter" | "summer" | "year_round";

/** TOU period names */
export type TouPeriodName =
  | "on_peak"
  | "mid_peak"
  | "off_peak"
  | "ultra_low_overnight"
  | "weekend_off_peak";

// ---------------------------------------------------------------------------
// 16 Canonical Building Types (from Data Point Spec v1.2)
// ---------------------------------------------------------------------------

export type BuildingType =
  | "office"
  | "retail"
  | "restaurant"
  | "grocery"
  | "warehouse"
  | "school"
  | "university"
  | "hospital"
  | "medical_office"
  | "hotel"
  | "multifamily"
  | "worship"
  | "arena"
  | "manufacturing"
  | "greenhouse"
  | "other";

// ---------------------------------------------------------------------------
// Configuration Data Structures (mirrors DB config tables)
// ---------------------------------------------------------------------------

/** Jurisdiction-level configuration (e.g., Ontario) */
export interface JurisdictionConfig {
  jurisdictionId: string;
  jurisdictionName: string;
  country: string;
  currency: string;
  areaUnit: string;
  energyUnit: string;
  gasUnit: string;
  taxRate: number;
  rebateName: string | null;
  rebateRate: number | null;
  rebateEligibleClasses: string[];
  effectiveDate: string;
}

/** Rate class configuration row */
export interface RateClassConfig {
  jurisdictionId: string;
  rateClassId: string;
  rateClassName: string;
  peakDemandMinKw: number | null;
  peakDemandMaxKw: number | null;
  annualKwhMin: number | null;
  annualKwhMax: number | null;
  hasDemandCharges: boolean;
  hasTemporalPricing: boolean;
  hasSeparateGa: boolean;
  defaultEffectiveRate: number;
  defaultEnergyRate: number;
  demandChargeRate: number | null;
  effectiveDate: string;
  sourceReference: string | null;
}

/** TOU period configuration row */
export interface TouPeriodConfig {
  jurisdictionId: string;
  rateClassId: string;
  season: Season;
  seasonStart: string | null;
  seasonEnd: string | null;
  periodName: TouPeriodName;
  weekdayHours: { start: string; end: string }[];
  weekendHours: { start: string; end: string }[] | null;
  ratePerKwh: number;
  effectiveDate: string;
}

// ---------------------------------------------------------------------------
// Building Assessment Inputs
// ---------------------------------------------------------------------------

/** Inputs collected from the user for rate classification */
export interface AssessmentInput {
  /** R1: Building size in sqft */
  buildingSizeSqft: number;
  /** One of 16 canonical building types */
  buildingType: BuildingType;
  /** R4: Annual operating hours */
  operatingHours: number;
  /** R5: Annual electricity consumption in kWh */
  annualElectricityKwh: number;
  /** R6: Annual electricity cost in $ (may be null if unknown) */
  annualElectricityCost: number | null;
  /** O1: Peak demand in kW (optional, user-provided) */
  peakDemandKw: number | null;
  /** User-selected rate structure (optional) */
  rateStructure: RateStructureOption | null;
  /** Postal code (for future LDC-specific lookups) */
  postalCode: string;
}

// ---------------------------------------------------------------------------
// Rate Classification Results (stored in Assessment Results)
// ---------------------------------------------------------------------------

/** Output of the rate classification engine */
export interface RateClassificationResult {
  /** Assigned rate class */
  rateClass: RateClass;
  /** How the class was determined */
  rateClassSource: RateClassSource;
  /** Confidence in the assignment */
  rateClassConfidence: RateClassConfidence;
  /** User's raw dropdown selection (if any) */
  rateStructure: RateStructureOption | null;
  /** Estimated peak demand used for classification (kW) */
  estimatedPeakKw: number;
  /** Whether building may qualify for Class A rates */
  classAEligible: boolean;
  /** All-in effective rate ($/kWh) — includes demand charges */
  effectiveRateTotal: number;
  /** Energy-only effective rate ($/kWh) — excludes demand charges */
  effectiveRateEnergy: number;
  /** How the effective rate was determined */
  effectiveRateSource: EffectiveRateSource;
  /** Combined demand charge rate ($/kW/month), null if RPP */
  demandChargeRate: number | null;
  /** Whether demand charge savings should be calculated */
  demandChargeApplicable: boolean;
  /** Warnings or notes for the user */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Measure Card Savings
// ---------------------------------------------------------------------------

/** Savings calculation output for a single measure card */
export interface MeasureSavings {
  /** Annual energy savings in kWh */
  energySavingsKwh: number;
  /** Annual energy savings in $ */
  energySavingsDollars: number;
  /** Whether this measure reduces peak demand */
  peakReductionApplicable: boolean;
  /** Peak demand reduction in kW (null if not applicable) */
  peakReductionKw: number | null;
  /** Annual demand charge savings in $ (null if RPP) */
  demandSavingsAnnual: number | null;
  /** Total annual savings (energy + demand) in $ */
  totalSavingsAnnual: number;
  /** Rate class for display context */
  rateClass: RateClass;
  /** Display label for rate basis */
  rateBasisLabel: string;
  /** 10-year projections at three escalation scenarios */
  tenYearProjections: {
    conservative: number;
    baseCase: number;
    highGrowth: number;
  };
}

// ---------------------------------------------------------------------------
// Load Factor Lookup
// ---------------------------------------------------------------------------

/** Load factor by building type — used to estimate peak demand from average load */
export interface LoadFactorEntry {
  buildingType: BuildingType;
  loadFactor: number;
  source: string;
}

// ---------------------------------------------------------------------------
// Rate Escalation Scenarios
// ---------------------------------------------------------------------------

export interface RateEscalationScenarios {
  conservative: number;
  baseCase: number;
  highGrowth: number;
}
