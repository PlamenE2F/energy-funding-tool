/**
 * Rate Classification Engine
 *
 * Estimates peak demand, classifies buildings into Ontario rate classes,
 * and cross-validates against effective rate ranges.
 *
 * Classification sequence:
 *   1. Estimate peak demand from annual kWh, operating hours, and load factor
 *   2. Classify into RPP (<50 kW), Class B (50–4,999 kW), or Class A (≥1 MW)
 *   3. Cross-validate against effective rate range
 *   4. If user provided rate structure, use to confirm or override
 *   5. Apply v1.1 rule: 40–60 kW band defaults to Class B (conservative)
 */

import type {
  AssessmentInput,
  RateClass,
  RateClassConfidence,
  RateClassSource,
  RateStructureOption,
  BuildingType,
} from "./types";
import {
  getLoadFactor,
  EFFECTIVE_RATE_RANGES,
} from "@/lib/config/ontario-rates";

// ---------------------------------------------------------------------------
// Peak Demand Estimation
// ---------------------------------------------------------------------------

/**
 * Estimate peak demand (kW) from annual consumption, operating hours,
 * and building-type load factor.
 *
 * Formula:
 *   average_load_kw = annual_electricity_kwh / operating_hours
 *   estimated_peak_kw = average_load_kw / load_factor
 */
export function estimatePeakDemand(
  annualKwh: number,
  operatingHours: number,
  buildingType: BuildingType
): number {
  if (operatingHours <= 0) {
    throw new Error("Operating hours must be positive");
  }

  const averageLoadKw = annualKwh / operatingHours;
  const loadFactor = getLoadFactor(buildingType);
  const estimatedPeakKw = averageLoadKw / loadFactor;

  return Math.round(estimatedPeakKw * 10) / 10; // Round to 1 decimal
}

// ---------------------------------------------------------------------------
// Rate Class Classification
// ---------------------------------------------------------------------------

interface ClassificationResult {
  rateClass: RateClass;
  confidence: RateClassConfidence;
  source: RateClassSource;
  warnings: string[];
}

/** Manufacturing-eligible building types for Class A 500 kW threshold */
const CLASS_A_MANUFACTURING_TYPES: BuildingType[] = [
  "manufacturing",
  "greenhouse",
];

/**
 * Classify a building into an Ontario rate class based on estimated peak demand.
 *
 * Thresholds (from spec Section 5.4):
 *   < 40 kW          → RPP (HIGH confidence)
 *   40–60 kW         → Class B (v1.1 correction: conservative default)
 *   60–900 kW        → Class B (HIGH confidence)
 *   900–1,100 kW     → Class B or Class A (MEDIUM confidence)
 *   > 1,100 kW       → Class A (HIGH confidence)
 *   > 5,000 kW       → Large Use / Class A (HIGH confidence)
 */
export function classifyByPeakDemand(
  estimatedPeakKw: number,
  buildingType: BuildingType
): { rateClass: RateClass; confidence: RateClassConfidence } {
  if (estimatedPeakKw < 40) {
    return { rateClass: "rpp_tou", confidence: "high" };
  }

  if (estimatedPeakKw >= 40 && estimatedPeakKw <= 60) {
    // v1.1 correction: 40–60 kW defaults to Class B (conservative)
    return { rateClass: "class_b", confidence: "medium" };
  }

  if (estimatedPeakKw > 60 && estimatedPeakKw <= 900) {
    return { rateClass: "class_b", confidence: "high" };
  }

  if (estimatedPeakKw > 900 && estimatedPeakKw <= 1100) {
    return { rateClass: "class_b", confidence: "medium" };
  }

  // > 1,100 kW — Class A territory
  return { rateClass: "class_a", confidence: "high" };
}

/**
 * Determine Class A eligibility.
 *
 * Class A eligible if:
 *   - estimated_peak_kw >= 1000 (general commercial), OR
 *   - estimated_peak_kw >= 500 AND building_type is manufacturing or greenhouse
 */
export function isClassAEligible(
  estimatedPeakKw: number,
  buildingType: BuildingType
): boolean {
  if (estimatedPeakKw >= 1000) return true;

  if (
    estimatedPeakKw >= 500 &&
    CLASS_A_MANUFACTURING_TYPES.includes(buildingType)
  ) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Effective Rate Cross-Validation
// ---------------------------------------------------------------------------

type RateCategory = "rpp" | "class_b" | "class_a";

function getRateCategory(rateClass: RateClass): RateCategory {
  if (rateClass.startsWith("rpp")) return "rpp";
  if (rateClass === "class_a") return "class_a";
  return "class_b";
}

/**
 * Cross-validate the assigned rate class against the user-derived effective rate.
 *
 * Expected ranges (from spec Section 5.4):
 *   RPP:     $0.12–$0.20/kWh
 *   Class B: $0.10–$0.16/kWh
 *   Class A: $0.08–$0.14/kWh
 *
 * Returns warnings if the effective rate falls outside the expected range.
 */
export function crossValidateEffectiveRate(
  effectiveRate: number,
  rateClass: RateClass
): { suggestedClass: RateClass | null; warning: string | null } {
  const category = getRateCategory(rateClass);
  const range = EFFECTIVE_RATE_RANGES[category];

  if (!range) return { suggestedClass: null, warning: null };

  if (effectiveRate < range.min) {
    // Rate is lower than expected — building may be in a higher-demand class
    if (category === "rpp") {
      return {
        suggestedClass: "class_b",
        warning: `Effective rate ($${effectiveRate.toFixed(3)}/kWh) is below the typical RPP range ($${range.min}–$${range.max}/kWh). This building may be on spot market pricing (Class B).`,
      };
    }
    if (category === "class_b") {
      return {
        suggestedClass: "class_a",
        warning: `Effective rate ($${effectiveRate.toFixed(3)}/kWh) is below the typical Class B range ($${range.min}–$${range.max}/kWh). This building may qualify for Class A rates.`,
      };
    }
  }

  if (effectiveRate > range.max) {
    // Rate is higher than expected — building may be in a lower-demand class
    if (category === "class_b") {
      return {
        suggestedClass: null,
        warning: `Effective rate ($${effectiveRate.toFixed(3)}/kWh) is above the typical Class B range. Verify annual cost and consumption figures.`,
      };
    }
    if (category === "class_a") {
      return {
        suggestedClass: "class_b",
        warning: `Effective rate ($${effectiveRate.toFixed(3)}/kWh) is above the typical Class A range ($${range.min}–$${range.max}/kWh). This building may be Class B.`,
      };
    }
  }

  return { suggestedClass: null, warning: null };
}

// ---------------------------------------------------------------------------
// Rate Structure Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the user's rate structure dropdown selection to a rate class.
 * Returns null if the selection doesn't directly map to a class.
 */
export function resolveRateStructure(
  rateStructure: RateStructureOption
): RateClass | null {
  switch (rateStructure) {
    case "rpp_tou":
      return "rpp_tou";
    case "rpp_ulo":
      return "rpp_ulo";
    case "rpp_tiered":
      return "rpp_tiered";
    case "spot_market":
    case "retailer_contract":
      return "class_b"; // Both indicate ≥50 kW
    case "dont_know":
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Full Classification Pipeline
// ---------------------------------------------------------------------------

/**
 * Run the complete rate classification pipeline for a building.
 *
 * Steps:
 *   1. Estimate peak demand (or use user-provided value)
 *   2. Classify by peak demand
 *   3. Cross-validate against effective rate (if available)
 *   4. Apply user's rate structure selection (if provided)
 *   5. Generate warnings
 */
export function classifyBuilding(input: AssessmentInput): ClassificationResult {
  const warnings: string[] = [];

  // Step 1: Determine peak demand
  const peakKw =
    input.peakDemandKw ??
    estimatePeakDemand(
      input.annualElectricityKwh,
      input.operatingHours,
      input.buildingType
    );

  // Step 2: Classify by peak demand
  let { rateClass, confidence } = classifyByPeakDemand(
    peakKw,
    input.buildingType
  );
  let source: RateClassSource = "estimated";

  // Step 3: Cross-validate against effective rate
  if (input.annualElectricityCost && input.annualElectricityKwh > 0) {
    const effectiveRate =
      input.annualElectricityCost / input.annualElectricityKwh;

    const validation = crossValidateEffectiveRate(effectiveRate, rateClass);

    if (validation.warning) {
      warnings.push(validation.warning);
    }

    // If rate suggests a different class and no user declaration, consider adjustment
    if (validation.suggestedClass && !input.rateStructure) {
      // Only override if peak-demand confidence is medium or lower
      if (confidence === "medium" || confidence === "low") {
        rateClass = validation.suggestedClass;
        confidence = "medium";
        warnings.push(
          `Rate class adjusted to ${rateClass} based on effective rate cross-validation.`
        );
      }
    }
  }

  // Step 4: Apply user's rate structure selection
  if (input.rateStructure && input.rateStructure !== "dont_know") {
    const userClass = resolveRateStructure(input.rateStructure);
    if (userClass) {
      const userIsRpp = userClass.startsWith("rpp");
      const estimatedIsRpp = rateClass.startsWith("rpp");

      // Check for RPP / spot market mismatch
      if (userIsRpp && !estimatedIsRpp && peakKw > 60) {
        warnings.push(
          "Buildings with peak demand above 50 kW are typically on spot market pricing. You may want to check your bill — look for 'Global Adjustment' as a separate line item."
        );
      }

      // User declaration overrides estimation
      rateClass = userClass;
      source = "user_declared";
      confidence = "high";
    }
  }

  return { rateClass, confidence, source, warnings };
}
