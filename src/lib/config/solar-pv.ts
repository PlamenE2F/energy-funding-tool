/**
 * Solar PV — Configuration Data
 *
 * All configurable values for the Solar PV measure card.
 * Irradiance zones, monthly generation shape, building-type config,
 * cost per watt, net metering credits, and solar-specific parameters.
 *
 * Sources:
 *   - NRCan PV potential maps, pvwatts.nrel.gov
 *   - O. Reg. 541/05 (Net Metering)
 *   - SaveOnEnergy Retrofit Program — Prescriptive Solar PV DER (2025/2026)
 *   - CRA Clean Technology ITC (2023–2034)
 *   - NREL crystalline silicon degradation (Jordan & Kurtz 2013)
 *   - NRCan average Canadian vehicle CO₂ emissions
 */

// Re-export shared financial config (do not duplicate values)
export {
  NPV_DISCOUNT_RATE,
  NPV_ANALYSIS_PERIOD_YEARS,
  RATE_ESCALATION_CONSERVATIVE,
  RATE_ESCALATION_BASE,
  RATE_ESCALATION_HIGH,
  CT_ITC_RATE,
  CT_ITC_REDUCED_RATE,
  SOE_CAP_PCT,
} from "@/lib/config/financial-defaults";

// ---------------------------------------------------------------------------
// Solar Irradiance by Zone [CONFIG] §3a
// ---------------------------------------------------------------------------

/** kWh/kWp/year by zone */
export const IRRADIANCE_SOUTH_ON = 1200;
export const IRRADIANCE_CENTRAL_ON = 1150;
export const IRRADIANCE_EAST_NORTH_ON = 1100;
export const IRRADIANCE_DEFAULT = 1150;

/** Flat-roof orientation derate */
export const ORIENTATION_FACTOR = 0.90;

export type IrradianceZone = "south_on" | "central_on" | "east_north_on";

export function getIrradianceZone(postalCode: string): {
  zone: IrradianceZone;
  irradiance: number;
} {
  const firstChar = postalCode.charAt(0).toUpperCase();
  switch (firstChar) {
    case "N":
      return { zone: "south_on", irradiance: IRRADIANCE_SOUTH_ON };
    case "P":
      return { zone: "east_north_on", irradiance: IRRADIANCE_EAST_NORTH_ON };
    default:
      return { zone: "central_on", irradiance: IRRADIANCE_CENTRAL_ON };
  }
}

// ---------------------------------------------------------------------------
// Monthly Generation Shape [CONFIG] §3b — sums to 1.000
// ---------------------------------------------------------------------------

export const MONTHLY_GEN_PCT: readonly number[] = [
  0.044, // Jan
  0.064, // Feb
  0.088, // Mar
  0.103, // Apr
  0.118, // May
  0.123, // Jun
  0.127, // Jul
  0.113, // Aug
  0.088, // Sep
  0.064, // Oct
  0.034, // Nov
  0.034, // Dec
];

// ---------------------------------------------------------------------------
// Building Type Solar Config [CONFIG] §3c
// ---------------------------------------------------------------------------

export interface SolarBuildingConfig {
  buildingTypeId: string;
  storeyFactor: number;
  roofUtilization: number;
  baseloadPct: number;
  selfConsumptionNm: number;
  loadFactor: number;
}

export const SOLAR_BUILDING_CONFIGS: SolarBuildingConfig[] = [
  { buildingTypeId: "office",             storeyFactor: 0.33, roofUtilization: 0.55, baseloadPct: 0.55, selfConsumptionNm: 0.65, loadFactor: 0.45 },
  { buildingTypeId: "warehouse",          storeyFactor: 1.00, roofUtilization: 0.70, baseloadPct: 0.75, selfConsumptionNm: 0.80, loadFactor: 0.55 },
  { buildingTypeId: "warehouse_cold",     storeyFactor: 1.00, roofUtilization: 0.60, baseloadPct: 0.60, selfConsumptionNm: 0.85, loadFactor: 0.60 },
  { buildingTypeId: "manufacturing",      storeyFactor: 1.00, roofUtilization: 0.65, baseloadPct: 0.70, selfConsumptionNm: 0.75, loadFactor: 0.55 },
  { buildingTypeId: "manufacturing_food", storeyFactor: 0.80, roofUtilization: 0.55, baseloadPct: 0.65, selfConsumptionNm: 0.80, loadFactor: 0.60 },
  { buildingTypeId: "retail",             storeyFactor: 0.80, roofUtilization: 0.65, baseloadPct: 0.55, selfConsumptionNm: 0.70, loadFactor: 0.45 },
  { buildingTypeId: "restaurant",         storeyFactor: 0.80, roofUtilization: 0.45, baseloadPct: 0.60, selfConsumptionNm: 0.60, loadFactor: 0.40 },
  { buildingTypeId: "medical_office",     storeyFactor: 0.33, roofUtilization: 0.40, baseloadPct: 0.65, selfConsumptionNm: 0.80, loadFactor: 0.55 },
  { buildingTypeId: "school",             storeyFactor: 0.50, roofUtilization: 0.55, baseloadPct: 0.50, selfConsumptionNm: 0.55, loadFactor: 0.35 },
  { buildingTypeId: "data_center",        storeyFactor: 0.50, roofUtilization: 0.30, baseloadPct: 0.90, selfConsumptionNm: 0.90, loadFactor: 0.80 },
  { buildingTypeId: "agriculture",        storeyFactor: 1.00, roofUtilization: 0.60, baseloadPct: 0.65, selfConsumptionNm: 0.70, loadFactor: 0.45 },
  { buildingTypeId: "greenhouse",         storeyFactor: 1.00, roofUtilization: 0.00, baseloadPct: 0.50, selfConsumptionNm: 0.00, loadFactor: 0.40 },
  { buildingTypeId: "multifamily",        storeyFactor: 0.25, roofUtilization: 0.45, baseloadPct: 0.60, selfConsumptionNm: 0.60, loadFactor: 0.50 },
  { buildingTypeId: "hotel",              storeyFactor: 0.25, roofUtilization: 0.40, baseloadPct: 0.55, selfConsumptionNm: 0.70, loadFactor: 0.50 },
  { buildingTypeId: "grocery",            storeyFactor: 1.00, roofUtilization: 0.60, baseloadPct: 0.70, selfConsumptionNm: 0.80, loadFactor: 0.55 },
  { buildingTypeId: "other",              storeyFactor: 0.50, roofUtilization: 0.55, baseloadPct: 0.60, selfConsumptionNm: 0.70, loadFactor: 0.50 },
];

export function getSolarBuildingConfig(buildingTypeId: string): SolarBuildingConfig {
  return (
    SOLAR_BUILDING_CONFIGS.find((c) => c.buildingTypeId === buildingTypeId) ??
    SOLAR_BUILDING_CONFIGS.find((c) => c.buildingTypeId === "other")!
  );
}

// ---------------------------------------------------------------------------
// Cost per Watt by System Size [CONFIG] §3d
// ---------------------------------------------------------------------------

export interface SolarCostBracket {
  label: string;
  maxKw: number;       // upper bound (exclusive), Infinity for last bracket
  midpoint: number;    // $/W
  high: number;        // $/W
}

export const SOLAR_COST_BRACKETS: SolarCostBracket[] = [
  { label: "Micro",      maxKw: 10,   midpoint: 2.50, high: 3.00 },
  { label: "Small",      maxKw: 50,   midpoint: 2.10, high: 2.40 },
  { label: "Medium",     maxKw: 200,  midpoint: 1.85, high: 2.10 },
  { label: "Large",      maxKw: 500,  midpoint: 1.65, high: 1.90 },
  { label: "Very Large", maxKw: Infinity, midpoint: 1.45, high: 1.70 },
];

export function getCostPerWatt(systemKw: number): { midpoint: number; high: number; label: string } {
  for (const bracket of SOLAR_COST_BRACKETS) {
    if (systemKw < bracket.maxKw) {
      return { midpoint: bracket.midpoint, high: bracket.high, label: bracket.label };
    }
  }
  const last = SOLAR_COST_BRACKETS[SOLAR_COST_BRACKETS.length - 1];
  return { midpoint: last.midpoint, high: last.high, label: last.label };
}

// ---------------------------------------------------------------------------
// Net Metering Credit Rates [CONFIG] §3e
// ---------------------------------------------------------------------------

/** RPP (< 50 kW demand) — $/kWh */
export const NM_CREDIT_RATE_RPP = 0.10;

/** Class B (50–999 kW) — $/kWh */
export const NM_CREDIT_RATE_CLASS_B = 0.09;

// ---------------------------------------------------------------------------
// Solar-Specific Parameters [CONFIG] §3f
// ---------------------------------------------------------------------------

/** Conservative for commercial flat-roof racking (W/sqft) */
export const PANEL_DENSITY_W_PER_SQFT = 15;

/** 0.5%/year NREL crystalline silicon */
export const DEGRADATION_RATE = 0.005;

/** BTM pathway self-consumption (system sized to baseload) */
export const BTM_SELF_CONSUMPTION = 0.95;

/** Fraction of baseload during solar hours (8am–6pm) */
export const DAYTIME_FRACTION = 0.45;

/** Added to NM self-consumption for extended/24-7 operating hours */
export const OPERATING_HOURS_BONUS = 0.10;

/** Maximum self-consumption after bonus */
export const OPERATING_HOURS_BONUS_CAP = 0.95;

/** O. Reg. 541/05 maximum net metering system size */
export const NET_METERING_CAP_KW = 500;

/** SaveOnEnergy prescriptive solar PV DER — systems <= 10 kW ($/kW-DC) */
export const SOE_SOLAR_RATE_MICRO = 1000;

/** SaveOnEnergy prescriptive solar PV DER — systems > 10 kW to 1 MW ($/kW-AC) */
export const SOE_SOLAR_RATE_STANDARD = 860;

/** 50% of eligible project costs cap */
export const SOE_SOLAR_CAP_PCT = 0.50;

/** Maximum system size for SaveOnEnergy incentive (kW) */
export const SOE_SOLAR_CAP_KW = 1000;

/** Fallback if rate framework returns null ($/kWh) */
export const FALLBACK_EFFECTIVE_RATE = 0.13;

/** Display warning if payback exceeds this */
export const PAYBACK_GUARD_YEARS = 25;

/** Threshold for "small building" edge case (sqft) */
export const SMALL_BUILDING_SQFT = 2000;

/** Warn if NM generation > this fraction of annual consumption */
export const OFFSET_WARNING_PCT = 0.90;

/** Average Canadian passenger vehicle CO₂ (tonnes/year) — NRCan */
export const CARS_EQUIVALENT_TONNES = 4.6;

// ---------------------------------------------------------------------------
// Confidence Type
// ---------------------------------------------------------------------------

export type SolarConfidence = "green" | "yellow" | "red";
