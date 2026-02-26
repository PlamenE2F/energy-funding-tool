/**
 * Demand Charge Savings Module
 *
 * Calculates demand charge savings for Class B+ buildings when
 * efficiency measures reduce peak demand.
 *
 * For RPP customers (< 50 kW): demand_savings = $0
 * For Class B+ customers:
 *   demand_savings_monthly = peak_kw_reduction × demand_charge_rate
 *   demand_savings_annual = demand_savings_monthly × 12
 */

import type { RateClass } from "./types";

// ---------------------------------------------------------------------------
// Peak Demand Impact by Measure Type
// ---------------------------------------------------------------------------

/**
 * Typical peak demand reduction percentages by measure type.
 * Stored here as defaults; in future these move to config tables.
 *
 * From spec Section 5.8:
 *   LED Lighting:    5–15% of lighting kW (modest)
 *   HVAC — cooling:  10–30% of cooling kW (significant)
 *   BAS/Controls:    5–20% of total peak (significant)
 *   Demand Response: varies (primary value proposition)
 *   Battery Storage: size-dependent (peak shaving)
 *   Envelope:        <5% (minimal)
 *   Compressed Air:  <5% (minimal)
 */
export type MeasureType =
  | "led_lighting"
  | "hvac_cooling"
  | "hvac_heating"
  | "bas_controls"
  | "demand_response"
  | "battery_storage"
  | "envelope"
  | "compressed_air"
  | "other";

interface PeakImpactProfile {
  reducesPeak: boolean;
  /** Fraction of relevant load reduced (e.g., 0.10 = 10%) */
  typicalReductionFraction: number;
  /** What the fraction applies to: 'lighting_kw', 'cooling_kw', 'total_peak' */
  reductionBasis: "lighting_kw" | "cooling_kw" | "total_peak" | "none";
}

export const PEAK_IMPACT_PROFILES: Record<MeasureType, PeakImpactProfile> = {
  led_lighting: {
    reducesPeak: true,
    typicalReductionFraction: 0.1, // 10% of lighting kW (midpoint of 5–15%)
    reductionBasis: "lighting_kw",
  },
  hvac_cooling: {
    reducesPeak: true,
    typicalReductionFraction: 0.2, // 20% of cooling kW (midpoint of 10–30%)
    reductionBasis: "cooling_kw",
  },
  hvac_heating: {
    reducesPeak: false,
    typicalReductionFraction: 0,
    reductionBasis: "none",
  },
  bas_controls: {
    reducesPeak: true,
    typicalReductionFraction: 0.125, // 12.5% of total peak (midpoint of 5–20%)
    reductionBasis: "total_peak",
  },
  demand_response: {
    reducesPeak: true,
    typicalReductionFraction: 0.15, // varies; use conservative estimate
    reductionBasis: "total_peak",
  },
  battery_storage: {
    reducesPeak: true,
    typicalReductionFraction: 0.2, // size-dependent; conservative estimate
    reductionBasis: "total_peak",
  },
  envelope: {
    reducesPeak: false, // Minimal, <5%
    typicalReductionFraction: 0,
    reductionBasis: "none",
  },
  compressed_air: {
    reducesPeak: false, // Minimal, <5%
    typicalReductionFraction: 0,
    reductionBasis: "none",
  },
  other: {
    reducesPeak: false,
    typicalReductionFraction: 0,
    reductionBasis: "none",
  },
};

// ---------------------------------------------------------------------------
// Demand Charge Calculations
// ---------------------------------------------------------------------------

export interface DemandSavingsResult {
  /** Whether demand charge savings apply */
  applicable: boolean;
  /** Peak demand reduction in kW */
  peakReductionKw: number;
  /** Monthly demand charge savings in $ */
  demandSavingsMonthly: number;
  /** Annual demand charge savings in $ */
  demandSavingsAnnual: number;
}

/**
 * Calculate demand charge savings for a specific measure.
 *
 * @param rateClass - Building's rate class
 * @param demandChargeRate - Combined demand charge rate in $/kW/month
 * @param peakReductionKw - Peak demand reduction from the measure in kW
 * @returns Demand savings breakdown
 */
export function calculateDemandSavings(
  rateClass: RateClass,
  demandChargeRate: number | null,
  peakReductionKw: number
): DemandSavingsResult {
  // RPP customers have no demand charges
  if (rateClass.startsWith("rpp") || !demandChargeRate || peakReductionKw <= 0) {
    return {
      applicable: false,
      peakReductionKw: 0,
      demandSavingsMonthly: 0,
      demandSavingsAnnual: 0,
    };
  }

  const demandSavingsMonthly = peakReductionKw * demandChargeRate;
  const demandSavingsAnnual = demandSavingsMonthly * 12;

  return {
    applicable: true,
    peakReductionKw,
    demandSavingsMonthly: Math.round(demandSavingsMonthly * 100) / 100,
    demandSavingsAnnual: Math.round(demandSavingsAnnual * 100) / 100,
  };
}

/**
 * Estimate peak demand reduction for a measure type given the building's
 * estimated peak demand and the measure's energy savings.
 *
 * This is a simplified estimation for Tier 2 — uses typical reduction
 * fractions from the measure's peak impact profile.
 *
 * @param measureType - The type of efficiency measure
 * @param estimatedPeakKw - Building's estimated peak demand in kW
 * @param energySavingsKwh - Annual energy savings from the measure in kWh
 * @param operatingHours - Building's annual operating hours
 * @returns Estimated peak demand reduction in kW
 */
export function estimatePeakReduction(
  measureType: MeasureType,
  estimatedPeakKw: number,
  energySavingsKwh: number,
  operatingHours: number
): number {
  const profile = PEAK_IMPACT_PROFILES[measureType];

  if (!profile.reducesPeak) return 0;

  // For measures that reduce total peak, apply the fraction directly
  if (profile.reductionBasis === "total_peak") {
    return (
      Math.round(
        estimatedPeakKw * profile.typicalReductionFraction * 10
      ) / 10
    );
  }

  // For lighting and cooling, estimate the sub-load kW first
  // Approximate: assume energy savings / operating hours ≈ average kW reduction
  // Peak reduction = average reduction / load factor for the sub-system
  const averageReductionKw = energySavingsKwh / operatingHours;

  // Sub-system load factors: lighting ~0.8 (fairly flat), cooling ~0.5 (peaky)
  const subSystemLoadFactor =
    profile.reductionBasis === "lighting_kw" ? 0.8 : 0.5;
  const peakReductionKw = averageReductionKw / subSystemLoadFactor;

  return Math.round(peakReductionKw * 10) / 10;
}
