/**
 * Effective Rate Calculation Module
 *
 * Calculates the effective electricity rate ($/kWh) for a building,
 * using one of two methods:
 *
 *   Method A (preferred): User-derived from annual cost ÷ annual kWh
 *   Method B (fallback):  Rate-class-based defaults from config tables
 *
 * For Class B+ customers, separates energy-only rate from demand charges.
 */

import type {
  AssessmentInput,
  RateClass,
  EffectiveRateSource,
} from "./types";
import {
  getRateClassConfig,
  DEMAND_CHARGE_DEFAULT,
  ONTARIO_RATE_CLASSES,
} from "@/lib/config/ontario-rates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EffectiveRateResult {
  /** All-in effective rate including demand charges ($/kWh) */
  effectiveRateTotal: number;
  /** Energy-only rate excluding demand charges ($/kWh) */
  effectiveRateEnergy: number;
  /** How the rate was determined */
  source: EffectiveRateSource;
  /** Combined demand charge rate ($/kW/month), null if RPP */
  demandChargeRate: number | null;
  /** Whether demand charges apply to this building */
  demandChargeApplicable: boolean;
  /** Any warnings generated during calculation */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Hard Validation (from approved decisions — 3 hard blocks maximum)
// ---------------------------------------------------------------------------

const HARD_VALIDATION_MAX_RATE = 0.35; // $/kWh

/**
 * Validate the effective rate isn't impossibly high.
 * Hard block: effective rate > $0.35/kWh triggers a validation error.
 */
export function validateEffectiveRate(effectiveRate: number): string | null {
  if (effectiveRate > HARD_VALIDATION_MAX_RATE) {
    return `Effective rate of $${effectiveRate.toFixed(3)}/kWh exceeds $0.35/kWh. Please verify your annual electricity cost and consumption values.`;
  }
  if (effectiveRate <= 0) {
    return "Effective rate must be positive. Please verify your annual electricity cost and consumption values.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Method A: User-Derived Effective Rate
// ---------------------------------------------------------------------------

/**
 * Calculate effective rate from user-provided annual cost and kWh.
 *
 * For RPP customers:
 *   effective_rate_energy = effective_rate_total (no demand charges)
 *
 * For Class B customers:
 *   demand_charge_annual_est = estimated_peak_kw × demand_charge_rate × 12
 *   energy_charges_est = annual_cost - demand_charge_annual_est
 *   effective_rate_energy = energy_charges_est / annual_kWh
 */
function calculateMethodA(
  annualCost: number,
  annualKwh: number,
  rateClass: RateClass,
  estimatedPeakKw: number
): EffectiveRateResult {
  const warnings: string[] = [];
  const effectiveRateTotal = annualCost / annualKwh;

  // Validate
  const validationError = validateEffectiveRate(effectiveRateTotal);
  if (validationError) {
    warnings.push(validationError);
  }

  // RPP — no demand charges
  if (rateClass.startsWith("rpp")) {
    return {
      effectiveRateTotal,
      effectiveRateEnergy: effectiveRateTotal,
      source: "user_derived",
      demandChargeRate: null,
      demandChargeApplicable: false,
      warnings,
    };
  }

  // Class B / Class A — separate demand charges from energy rate
  const rateConfig = resolveClassBConfig(rateClass);
  const demandChargeRate = rateConfig?.demandChargeRate ?? DEMAND_CHARGE_DEFAULT;

  const demandChargeAnnualEst = estimatedPeakKw * demandChargeRate * 12;
  let energyChargesEst = annualCost - demandChargeAnnualEst;

  // Guard: if demand charges exceed total cost, use a more conservative estimate
  if (energyChargesEst <= 0) {
    warnings.push(
      "Estimated demand charges exceed total annual cost. Using default energy rate as fallback."
    );
    const fallbackConfig = resolveClassBConfig(rateClass);
    return {
      effectiveRateTotal,
      effectiveRateEnergy: fallbackConfig?.defaultEnergyRate ?? 0.105,
      source: "user_derived",
      demandChargeRate,
      demandChargeApplicable: true,
      warnings,
    };
  }

  const effectiveRateEnergy = energyChargesEst / annualKwh;

  // Sanity check: energy-only rate shouldn't be negative or unreasonably low
  if (effectiveRateEnergy < 0.04) {
    warnings.push(
      `Energy-only rate ($${effectiveRateEnergy.toFixed(3)}/kWh) is unusually low. Demand charge separation may be inaccurate.`
    );
  }

  return {
    effectiveRateTotal,
    effectiveRateEnergy,
    source: "user_derived",
    demandChargeRate,
    demandChargeApplicable: true,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Method B: Rate-Class-Based Default
// ---------------------------------------------------------------------------

/**
 * Use default rates from config when user cost data is unavailable.
 */
function calculateMethodB(rateClass: RateClass): EffectiveRateResult {
  const rateConfig = resolveRateConfig(rateClass);

  if (!rateConfig) {
    // Ultimate fallback — should not happen with proper config
    return {
      effectiveRateTotal: 0.13,
      effectiveRateEnergy: 0.13,
      source: "class_default",
      demandChargeRate: null,
      demandChargeApplicable: false,
      warnings: [
        "Rate class configuration not found. Using generic Ontario average.",
      ],
    };
  }

  return {
    effectiveRateTotal: rateConfig.defaultEffectiveRate,
    effectiveRateEnergy: rateConfig.defaultEnergyRate,
    source: "class_default",
    demandChargeRate: rateConfig.demandChargeRate,
    demandChargeApplicable: rateConfig.hasDemandCharges,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Config Resolution Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the appropriate rate class config for a given rate class.
 * Maps abstract class names to specific config entries.
 */
function resolveRateConfig(rateClass: RateClass) {
  // Direct match
  const directMatch = ONTARIO_RATE_CLASSES.find((rc) =>
    rc.rateClassId === `on_${rateClass}`
  );
  if (directMatch) return directMatch;

  // Generic class_b → default to 50–999 kW
  if (rateClass === "class_b") {
    return getRateClassConfig("on_class_b_50_999");
  }

  // Generic class_a
  if (rateClass === "class_a") {
    return getRateClassConfig("on_class_a");
  }

  return null;
}

/**
 * Resolve the Class B config — picks the right sub-class based on peak demand
 * or falls back to the 50–999 kW config.
 */
function resolveClassBConfig(rateClass: RateClass) {
  if (rateClass === "class_a") {
    return getRateClassConfig("on_class_a");
  }
  // Default to the 50–999 kW Class B config
  return getRateClassConfig("on_class_b_50_999");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the effective rate for a building.
 *
 * Uses Method A (user-derived) when both cost and kWh are available.
 * Falls back to Method B (config defaults) otherwise.
 */
export function calculateEffectiveRate(
  input: AssessmentInput,
  rateClass: RateClass,
  estimatedPeakKw: number
): EffectiveRateResult {
  // Method A: User-derived (preferred)
  if (
    input.annualElectricityCost !== null &&
    input.annualElectricityCost > 0 &&
    input.annualElectricityKwh > 0
  ) {
    return calculateMethodA(
      input.annualElectricityCost,
      input.annualElectricityKwh,
      rateClass,
      estimatedPeakKw
    );
  }

  // Method B: Rate-class-based default (fallback)
  return calculateMethodB(rateClass);
}

/**
 * Resolve the Class B config for a specific peak demand range.
 * Used by demand charge calculations to get the right $/kW/month rate.
 */
export function resolveClassBConfigForPeak(estimatedPeakKw: number) {
  if (estimatedPeakKw >= 1000) {
    return getRateClassConfig("on_class_b_1000_4999");
  }
  return getRateClassConfig("on_class_b_50_999");
}
