/**
 * Solar PV — Calculation Engine
 *
 * 12-step calculation pipeline:
 *   1.  Determine solar irradiance → effective_irradiance
 *   2.  Estimate roof area → solar_available_roof_sqft
 *   3.  Size both systems → system_kw_btm, system_kw_nm
 *   4.  Estimate annual generation → annual_generation_kwh for each pathway
 *   5.  Split self-consumption vs. export → for each pathway
 *   6.  Calculate annual dollar savings → for each pathway
 *   7.  Demand charge interaction → $0 at Tier 2 (note only)
 *   8.  Estimate project cost → midpoint and upper, each pathway
 *   9.  Estimate incentives → BTM stack and NM stack
 *  10.  Net cost and simple payback → each pathway
 *  11.  NPV with degradation and 3 rate scenarios → each pathway
 *  12.  CO₂ reduction → each pathway
 *   →  Recommend pathway with higher NPV_base
 *   →  Output BESS-ready fields
 *
 * Integrates with:
 *   - Rate Classification Framework (effectiveRateEnergy, rateClass)
 *   - EUI Baseline & Emissions Engine (completion_path, baseload)
 *   - Shared Financial Defaults (NPV, escalation, incentive params)
 */

import type { RateClassificationResult, RateClass } from "@/lib/rates/types";
import type { CompletionPath, RegressionQuality } from "@/lib/eui/types";
import {
  getIrradianceZone,
  getSolarBuildingConfig,
  getCostPerWatt,
  ORIENTATION_FACTOR,
  MONTHLY_GEN_PCT,
  PANEL_DENSITY_W_PER_SQFT,
  DEGRADATION_RATE,
  BTM_SELF_CONSUMPTION,
  DAYTIME_FRACTION,
  OPERATING_HOURS_BONUS,
  OPERATING_HOURS_BONUS_CAP,
  NET_METERING_CAP_KW,
  SOE_SOLAR_RATE_MICRO,
  SOE_SOLAR_RATE_STANDARD,
  SOE_SOLAR_CAP_PCT,
  SOE_SOLAR_CAP_KW,
  NM_CREDIT_RATE_RPP,
  NM_CREDIT_RATE_CLASS_B,
  FALLBACK_EFFECTIVE_RATE,
  PAYBACK_GUARD_YEARS,
  SMALL_BUILDING_SQFT,
  OFFSET_WARNING_PCT,
  CARS_EQUIVALENT_TONNES,
  type IrradianceZone,
  type SolarConfidence,
} from "@/lib/config/solar-pv";
import {
  NPV_DISCOUNT_RATE,
  NPV_ANALYSIS_PERIOD_YEARS,
  RATE_ESCALATION_CONSERVATIVE,
  RATE_ESCALATION_BASE,
  RATE_ESCALATION_HIGH,
  CT_ITC_RATE,
} from "@/lib/config/financial-defaults";
import { SCOPE2_AVERAGE_FACTOR } from "@/lib/config/emissions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SolarPathway = "btm" | "net_metered";

export type OperatingHoursCategory = "standard" | "extended" | "24_7";

export interface SolarCalculationInput {
  postalCode: string;
  buildingTypeId: string;
  buildingSizeSqft: number;
  operatingHours: OperatingHoursCategory;
  annualElectricityKwh: number;

  /** Peak demand (optional — O1) */
  peakDemandKw: number | null;

  /** Rate framework output (null triggers fallback) */
  rateResult: RateClassificationResult | null;

  /** EUI engine: completion path */
  completionPath: CompletionPath | null;
  /** Enhanced path: regression-derived baseload annual (kWh) */
  baseloadElectricAnnual: number | null;
  /** Enhanced path: regression quality flag */
  regressionQualityFlag: RegressionQuality | null;

  /** EUI validation warning (from benchmark engine) */
  euiValidationWarning: boolean;

  /** Ownership type for CTA framing */
  ownershipType: "own" | "lease" | "other" | null;
}

export interface SolarPathwayResult {
  systemKw: number;
  systemKwRounded: number;
  annualGenerationKwh: number;
  selfConsumedKwh: number;
  exportedOrWastedKwh: number;
  selfConsumptionPct: number;
  annualDollarSavings: number;
  costMidpoint: number;
  costUpper: number;
  costLabel: string;
  incentiveLow: number;
  incentiveHigh: number;
  incentiveSoe: number;
  incentiveCtItc: number;
  netCostMidpoint: number;
  netCostUpper: number;
  paybackMidpoint: number | null;
  paybackUpper: number | null;
  npvConservative: number;
  npvBase: number;
  npvHigh: number;
  offsetPct: number;
}

export interface SolarCalculationResult {
  solarShowCard: boolean;
  greenhouseNote: string | null;

  // Step 1: Irradiance
  irradianceZone: IrradianceZone;
  zoneIrradiance: number;
  effectiveIrradiance: number;

  // Step 2: Roof area
  roofFootprintSqft: number;
  availableRoofSqft: number;

  // Step 3: Sizing
  roofConstrainedKw: number;
  btmConstrainedKw: number;
  nmConstrainedKw: number;

  // Pathway results
  btm: SolarPathwayResult;
  nm: SolarPathwayResult;

  // Recommendation
  recommendedPathway: SolarPathway;
  recommended: SolarPathwayResult;

  // Step 7: Demand charge
  demandChargeSavings: number;
  demandNote: string;
  classANote: string | null;

  // Step 12: CO₂
  co2ReductionTonnes: number;
  carsEquivalent: number;

  // BESS-ready outputs
  solarExcessGenerationKwh: number;
  solarSelfConsumptionRatio: number;
  solarPeakDemandKw: number;
  solarMonthlyGenerationKwh: number[];

  // NM-specific
  nmCreditRate: number;
  nmSelfConsumptionPct: number;

  // Traceability
  effectiveRateUsed: number;
  rateClassUsed: string;
  completionPathUsed: string;
  storefFactorUsed: number;
  roofUtilizationUsed: number;
  baseloadPctUsed: number;

  // Confidence and flags
  confidence: SolarConfidence;
  confidenceNote: string;
  flags: SolarFlag[];
}

export interface SolarFlag {
  type: "info" | "warning" | "edge_case";
  message: string;
}

// ---------------------------------------------------------------------------
// Main Calculation Pipeline
// ---------------------------------------------------------------------------

export function calculateSolarPv(
  input: SolarCalculationInput
): SolarCalculationResult {
  const flags: SolarFlag[] = [];

  // Greenhouse gate check
  if (input.buildingTypeId === "greenhouse") {
    return createGreenhouseResult();
  }

  const buildingConfig = getSolarBuildingConfig(input.buildingTypeId);

  // -------------------------------------------------------------------------
  // Step 1: Determine Solar Irradiance
  // -------------------------------------------------------------------------

  const { zone: irradianceZone, irradiance: zoneIrradiance } =
    getIrradianceZone(input.postalCode);
  const effectiveIrradiance = zoneIrradiance * ORIENTATION_FACTOR;

  // -------------------------------------------------------------------------
  // Step 2: Estimate Available Roof Area
  // -------------------------------------------------------------------------

  const roofFootprintSqft = input.buildingSizeSqft * buildingConfig.storeyFactor;
  const availableRoofSqft = roofFootprintSqft * buildingConfig.roofUtilization;

  // -------------------------------------------------------------------------
  // Step 3: Size Both Systems
  // -------------------------------------------------------------------------

  // 3a. Roof-constrained (both pathways)
  const roofConstrainedKw =
    (availableRoofSqft * PANEL_DENSITY_W_PER_SQFT) / 1000;

  // 3b. BTM pathway sizing
  let daytimeBaseloadKwh: number;
  const useEnhanced =
    input.completionPath === "enhanced" &&
    input.regressionQualityFlag !== null &&
    (input.regressionQualityFlag === "good" ||
      input.regressionQualityFlag === "moderate") &&
    input.baseloadElectricAnnual !== null;

  if (useEnhanced && input.baseloadElectricAnnual !== null) {
    daytimeBaseloadKwh = input.baseloadElectricAnnual * DAYTIME_FRACTION;
  } else {
    daytimeBaseloadKwh =
      input.annualElectricityKwh *
      buildingConfig.baseloadPct *
      DAYTIME_FRACTION;
  }

  const btmConstrainedKw = daytimeBaseloadKwh / effectiveIrradiance;
  const systemKwBtm = Math.min(roofConstrainedKw, btmConstrainedKw);

  // 3c. NM pathway sizing
  const consumptionConstrainedKw =
    input.annualElectricityKwh / effectiveIrradiance;
  const nmConstrainedKw = Math.min(
    roofConstrainedKw,
    consumptionConstrainedKw,
    NET_METERING_CAP_KW
  );
  const systemKwNm = nmConstrainedKw;

  // -------------------------------------------------------------------------
  // Step 4: Estimate Annual Generation
  // -------------------------------------------------------------------------

  const annualGenKwhBtm = systemKwBtm * effectiveIrradiance;
  const annualGenKwhNm = systemKwNm * effectiveIrradiance;

  // -------------------------------------------------------------------------
  // Step 5: Self-Consumption and Export Split
  // -------------------------------------------------------------------------

  // BTM
  const selfConsumedKwhBtm = annualGenKwhBtm * BTM_SELF_CONSUMPTION;
  const excessGenKwhBtm = annualGenKwhBtm * (1 - BTM_SELF_CONSUMPTION);

  // NM — self-consumption with operating hours bonus
  let nmSelfConsumptionPct = buildingConfig.selfConsumptionNm;
  if (
    input.operatingHours === "extended" ||
    input.operatingHours === "24_7"
  ) {
    nmSelfConsumptionPct = Math.min(
      nmSelfConsumptionPct + OPERATING_HOURS_BONUS,
      OPERATING_HOURS_BONUS_CAP
    );
  }

  const selfConsumedKwhNm = annualGenKwhNm * nmSelfConsumptionPct;
  const exportedKwhNm = annualGenKwhNm * (1 - nmSelfConsumptionPct);

  // -------------------------------------------------------------------------
  // Step 6: Annual Dollar Savings — Energy
  // -------------------------------------------------------------------------

  const effectiveRate =
    input.rateResult?.effectiveRateEnergy ?? FALLBACK_EFFECTIVE_RATE;
  const rateClassUsed = input.rateResult?.rateClass ?? "unknown";

  // NM credit rate
  const rateClassForCredit: RateClass = input.rateResult?.rateClass ?? "unknown";
  const isRpp =
    rateClassForCredit === "rpp_tou" ||
    rateClassForCredit === "rpp_ulo" ||
    rateClassForCredit === "rpp_tiered" ||
    rateClassForCredit === "unknown"; // default to RPP for unknown
  const nmCreditRate = isRpp ? NM_CREDIT_RATE_RPP : NM_CREDIT_RATE_CLASS_B;

  // BTM: all value from self-consumption, no export value
  const annualDollarSavingsBtm = selfConsumedKwhBtm * effectiveRate;

  // NM: self-consumption at full rate + export at credit rate
  const annualDollarSavingsNm =
    selfConsumedKwhNm * effectiveRate + exportedKwhNm * nmCreditRate;

  // -------------------------------------------------------------------------
  // Step 7: Demand Charge Interaction — $0 at Tier 2
  // -------------------------------------------------------------------------

  const demandChargeSavings = 0;
  const demandNote =
    "Solar may reduce your peak demand charges. " +
    "A Tier 3 analysis with interval data can quantify this benefit.";

  const classANote =
    rateClassUsed === "class_a"
      ? "For Class A customers, solar generation during Ontario's top-5 peak demand hours " +
        "can significantly reduce Global Adjustment charges. This benefit can be substantial " +
        "but requires interval data analysis — strongly recommend Tier 3 assessment."
      : null;

  if (classANote) {
    flags.push({ type: "info", message: classANote });
  }

  // -------------------------------------------------------------------------
  // Step 8: Project Cost
  // -------------------------------------------------------------------------

  const btmCost = getCostPerWatt(systemKwBtm);
  const projectCostMidpointBtm = systemKwBtm * 1000 * btmCost.midpoint;
  const projectCostUpperBtm = systemKwBtm * 1000 * btmCost.high;

  const nmCost = getCostPerWatt(systemKwNm);
  const projectCostMidpointNm = systemKwNm * 1000 * nmCost.midpoint;
  const projectCostUpperNm = systemKwNm * 1000 * nmCost.high;

  // -------------------------------------------------------------------------
  // Step 9: Incentive Estimation
  // -------------------------------------------------------------------------

  // BTM Incentive Stack — SaveOnEnergy + CT ITC
  let incentiveSoeBtm: number;
  if (systemKwBtm <= 10) {
    incentiveSoeBtm = systemKwBtm * SOE_SOLAR_RATE_MICRO;
  } else {
    incentiveSoeBtm = systemKwBtm * SOE_SOLAR_RATE_STANDARD;
  }

  // Cap at 50% of eligible project costs
  incentiveSoeBtm = Math.min(
    incentiveSoeBtm,
    projectCostMidpointBtm * SOE_SOLAR_CAP_PCT
  );

  // Cap at 1 MW for incentive calculation
  if (systemKwBtm > SOE_SOLAR_CAP_KW) {
    const cappedIncentive = SOE_SOLAR_CAP_KW * SOE_SOLAR_RATE_STANDARD;
    incentiveSoeBtm = Math.min(
      cappedIncentive,
      projectCostMidpointBtm * SOE_SOLAR_CAP_PCT
    );
  }

  const incentiveCtItcBtm = projectCostMidpointBtm * CT_ITC_RATE;

  const incentiveBtmLow = incentiveSoeBtm; // SaveOnEnergy only
  const incentiveBtmHigh = incentiveSoeBtm + incentiveCtItcBtm; // SaveOnEnergy + CT ITC

  // NM Incentive Stack — SaveOnEnergy: NOT ELIGIBLE for Net Metered
  const incentiveSoeNm = 0;
  const incentiveCtItcNm = projectCostMidpointNm * CT_ITC_RATE;

  const incentiveNmLow = 0; // No SaveOnEnergy, no CT ITC (conservative)
  const incentiveNmHigh = incentiveCtItcNm; // CT ITC only

  // -------------------------------------------------------------------------
  // Step 10: Net Cost and Simple Payback
  // -------------------------------------------------------------------------

  const netCostMidpointBtm = projectCostMidpointBtm - incentiveBtmLow;
  const netCostUpperBtm = projectCostUpperBtm - incentiveBtmLow;

  const netCostMidpointNm = projectCostMidpointNm - incentiveNmLow; // = full cost
  const netCostUpperNm = projectCostUpperNm - incentiveNmLow;

  const annualTotalSavingsBtm = annualDollarSavingsBtm + demandChargeSavings;
  const annualTotalSavingsNm = annualDollarSavingsNm + demandChargeSavings;

  const paybackMidpointBtm =
    annualTotalSavingsBtm > 0
      ? netCostMidpointBtm / annualTotalSavingsBtm
      : null;
  const paybackUpperBtm =
    annualTotalSavingsBtm > 0 ? netCostUpperBtm / annualTotalSavingsBtm : null;

  const paybackMidpointNm =
    annualTotalSavingsNm > 0
      ? netCostMidpointNm / annualTotalSavingsNm
      : null;
  const paybackUpperNm =
    annualTotalSavingsNm > 0 ? netCostUpperNm / annualTotalSavingsNm : null;

  // -------------------------------------------------------------------------
  // Step 11: NPV with Degradation and Three Rate Escalation Scenarios
  // -------------------------------------------------------------------------

  // BTM NPV — use high incentives (incorporated) for base recommendation
  const netCostBtmInc = projectCostMidpointBtm - incentiveBtmHigh;
  const npvBtmConservative = calculateNpvBtm(
    netCostBtmInc,
    annualDollarSavingsBtm,
    RATE_ESCALATION_CONSERVATIVE
  );
  const npvBtmBase = calculateNpvBtm(
    netCostBtmInc,
    annualDollarSavingsBtm,
    RATE_ESCALATION_BASE
  );
  const npvBtmHigh = calculateNpvBtm(
    netCostBtmInc,
    annualDollarSavingsBtm,
    RATE_ESCALATION_HIGH
  );

  // NM NPV — two value streams
  const netCostNmInc = projectCostMidpointNm - incentiveNmHigh;
  const npvNmConservative = calculateNpvNm(
    netCostNmInc,
    selfConsumedKwhNm,
    exportedKwhNm,
    effectiveRate,
    nmCreditRate,
    RATE_ESCALATION_CONSERVATIVE
  );
  const npvNmBase = calculateNpvNm(
    netCostNmInc,
    selfConsumedKwhNm,
    exportedKwhNm,
    effectiveRate,
    nmCreditRate,
    RATE_ESCALATION_BASE
  );
  const npvNmHigh = calculateNpvNm(
    netCostNmInc,
    selfConsumedKwhNm,
    exportedKwhNm,
    effectiveRate,
    nmCreditRate,
    RATE_ESCALATION_HIGH
  );

  // Pathway recommendation: BTM wins ties (safer — SaveOnEnergy is guaranteed)
  const recommendedPathway: SolarPathway =
    npvNmBase > npvBtmBase ? "net_metered" : "btm";

  // -------------------------------------------------------------------------
  // Step 12: CO₂ Reduction
  // -------------------------------------------------------------------------

  const annualGenRecommended =
    recommendedPathway === "btm" ? annualGenKwhBtm : annualGenKwhNm;
  const co2ReductionTonnes =
    (annualGenRecommended * SCOPE2_AVERAGE_FACTOR) / 1_000_000;
  const carsEquivalent = co2ReductionTonnes / CARS_EQUIVALENT_TONNES;

  // -------------------------------------------------------------------------
  // BESS-Ready Outputs
  // -------------------------------------------------------------------------

  const solarExcessGenerationKwh =
    recommendedPathway === "btm" ? excessGenKwhBtm : exportedKwhNm;
  const solarSelfConsumptionRatio =
    recommendedPathway === "btm" ? BTM_SELF_CONSUMPTION : nmSelfConsumptionPct;
  const solarPeakDemandKw =
    input.peakDemandKw ?? estimatePeakDemand(input.annualElectricityKwh, input.buildingTypeId);
  const solarMonthlyGenerationKwh = MONTHLY_GEN_PCT.map(
    (pct) => annualGenRecommended * pct
  );

  // -------------------------------------------------------------------------
  // Offset percentage
  // -------------------------------------------------------------------------

  const offsetPctBtm =
    input.annualElectricityKwh > 0
      ? (annualGenKwhBtm / input.annualElectricityKwh) * 100
      : 0;
  const offsetPctNm =
    input.annualElectricityKwh > 0
      ? (annualGenKwhNm / input.annualElectricityKwh) * 100
      : 0;

  // -------------------------------------------------------------------------
  // Edge cases and flags
  // -------------------------------------------------------------------------

  // Small building
  if (input.buildingSizeSqft < SMALL_BUILDING_SQFT) {
    flags.push({
      type: "warning",
      message:
        "For buildings under 2,000 sqft, fixed installation costs " +
        "may make solar less cost-effective. Consider a Tier 3 assessment.",
    });
  }

  // NM offset > 90%
  const offsetRatioNm =
    input.annualElectricityKwh > 0
      ? annualGenKwhNm / input.annualElectricityKwh
      : 0;
  if (offsetRatioNm > OFFSET_WARNING_PCT) {
    flags.push({
      type: "warning",
      message:
        "System sized to offset nearly all your annual electricity. " +
        "Under Ontario net metering, any credits not used within 12 months are forfeited " +
        "— avoid oversizing.",
    });
  }

  // NM cap exceeded by roof
  if (
    roofConstrainedKw > NET_METERING_CAP_KW &&
    systemKwNm === NET_METERING_CAP_KW
  ) {
    flags.push({
      type: "info",
      message:
        "Your building's roof can support a system larger than the 500 kW " +
        "net metering cap. The Behind-the-Meter pathway allows a larger system — " +
        "consider a Tier 3 analysis for optimized sizing.",
    });
  }

  // Payback guard (recommended pathway)
  const recPayback =
    recommendedPathway === "btm" ? paybackMidpointBtm : paybackMidpointNm;
  if (recPayback !== null && recPayback > PAYBACK_GUARD_YEARS) {
    flags.push({
      type: "warning",
      message:
        "Payback exceeds 25 years — solar economics may be challenging " +
        "for this building. Consider a Tier 3 analysis.",
    });
  }

  // Rate framework null
  if (input.rateResult === null) {
    flags.push({
      type: "info",
      message: `Using fallback electricity rate of $${FALLBACK_EFFECTIVE_RATE}/kWh.`,
    });
  }

  // Data center note
  if (input.buildingTypeId === "data_center") {
    flags.push({
      type: "info",
      message:
        "Data centers have limited available roof area due to cooling " +
        "infrastructure. Solar can offset only a small fraction of total electricity consumption.",
    });
  }

  // Demand note — always
  flags.push({ type: "info", message: demandNote });

  // -------------------------------------------------------------------------
  // Confidence
  // -------------------------------------------------------------------------

  const confidence = determineConfidence(input);
  const confidenceNote = getConfidenceNote(confidence);

  // -------------------------------------------------------------------------
  // Build pathway result objects
  // -------------------------------------------------------------------------

  const btmResult: SolarPathwayResult = {
    systemKw: systemKwBtm,
    systemKwRounded: Math.round(systemKwBtm),
    annualGenerationKwh: round(annualGenKwhBtm, 0),
    selfConsumedKwh: round(selfConsumedKwhBtm, 0),
    exportedOrWastedKwh: round(excessGenKwhBtm, 0),
    selfConsumptionPct: BTM_SELF_CONSUMPTION,
    annualDollarSavings: round(annualDollarSavingsBtm, 0),
    costMidpoint: round(projectCostMidpointBtm, 0),
    costUpper: round(projectCostUpperBtm, 0),
    costLabel: btmCost.label,
    incentiveLow: round(incentiveBtmLow, 0),
    incentiveHigh: round(incentiveBtmHigh, 0),
    incentiveSoe: round(incentiveSoeBtm, 0),
    incentiveCtItc: round(incentiveCtItcBtm, 0),
    netCostMidpoint: round(netCostMidpointBtm, 0),
    netCostUpper: round(netCostUpperBtm, 0),
    paybackMidpoint: paybackMidpointBtm !== null ? round(paybackMidpointBtm, 1) : null,
    paybackUpper: paybackUpperBtm !== null ? round(paybackUpperBtm, 1) : null,
    npvConservative: round(npvBtmConservative, 0),
    npvBase: round(npvBtmBase, 0),
    npvHigh: round(npvBtmHigh, 0),
    offsetPct: round(offsetPctBtm, 0),
  };

  const nmResult: SolarPathwayResult = {
    systemKw: systemKwNm,
    systemKwRounded: Math.round(systemKwNm),
    annualGenerationKwh: round(annualGenKwhNm, 0),
    selfConsumedKwh: round(selfConsumedKwhNm, 0),
    exportedOrWastedKwh: round(exportedKwhNm, 0),
    selfConsumptionPct: nmSelfConsumptionPct,
    annualDollarSavings: round(annualDollarSavingsNm, 0),
    costMidpoint: round(projectCostMidpointNm, 0),
    costUpper: round(projectCostUpperNm, 0),
    costLabel: nmCost.label,
    incentiveLow: round(incentiveNmLow, 0),
    incentiveHigh: round(incentiveNmHigh, 0),
    incentiveSoe: round(incentiveSoeNm, 0),
    incentiveCtItc: round(incentiveCtItcNm, 0),
    netCostMidpoint: round(netCostMidpointNm, 0),
    netCostUpper: round(netCostUpperNm, 0),
    paybackMidpoint: paybackMidpointNm !== null ? round(paybackMidpointNm, 1) : null,
    paybackUpper: paybackUpperNm !== null ? round(paybackUpperNm, 1) : null,
    npvConservative: round(npvNmConservative, 0),
    npvBase: round(npvNmBase, 0),
    npvHigh: round(npvNmHigh, 0),
    offsetPct: round(offsetPctNm, 0),
  };

  const recommended = recommendedPathway === "btm" ? btmResult : nmResult;

  return {
    solarShowCard: true,
    greenhouseNote: null,
    irradianceZone,
    zoneIrradiance,
    effectiveIrradiance,
    roofFootprintSqft: round(roofFootprintSqft, 0),
    availableRoofSqft: round(availableRoofSqft, 0),
    roofConstrainedKw: round(roofConstrainedKw, 0),
    btmConstrainedKw: round(btmConstrainedKw, 0),
    nmConstrainedKw: round(nmConstrainedKw, 0),
    btm: btmResult,
    nm: nmResult,
    recommendedPathway,
    recommended,
    demandChargeSavings,
    demandNote,
    classANote,
    co2ReductionTonnes: round(co2ReductionTonnes, 1),
    carsEquivalent: round(carsEquivalent, 1),
    solarExcessGenerationKwh: round(solarExcessGenerationKwh, 0),
    solarSelfConsumptionRatio: solarSelfConsumptionRatio,
    solarPeakDemandKw: round(solarPeakDemandKw, 0),
    solarMonthlyGenerationKwh: solarMonthlyGenerationKwh.map((v) => round(v, 0)),
    nmCreditRate,
    nmSelfConsumptionPct,
    effectiveRateUsed: effectiveRate,
    rateClassUsed,
    completionPathUsed: useEnhanced ? "enhanced" : "standard",
    storefFactorUsed: buildingConfig.storeyFactor,
    roofUtilizationUsed: buildingConfig.roofUtilization,
    baseloadPctUsed: buildingConfig.baseloadPct,
    confidence,
    confidenceNote,
    flags,
  };
}

// ---------------------------------------------------------------------------
// NPV Calculations
// ---------------------------------------------------------------------------

/**
 * BTM NPV with degradation — single value stream.
 */
function calculateNpvBtm(
  netCost: number,
  annualSavingsBase: number,
  escalationRate: number
): number {
  let npv = -netCost;
  for (let t = 1; t <= NPV_ANALYSIS_PERIOD_YEARS; t++) {
    const degradationFactor = Math.pow(1 - DEGRADATION_RATE, t - 1);
    const escalationFactor = Math.pow(1 + escalationRate, t);
    const discountFactor = Math.pow(1 + NPV_DISCOUNT_RATE, t);
    const yearSavings = annualSavingsBase * degradationFactor * escalationFactor;
    npv += yearSavings / discountFactor;
  }
  return npv;
}

/**
 * NM NPV with degradation — two value streams
 * (self-consumption at full rate + export at NM credit rate).
 */
function calculateNpvNm(
  netCost: number,
  selfConsumedKwh: number,
  exportedKwh: number,
  effectiveRate: number,
  nmCreditRate: number,
  escalationRate: number
): number {
  let npv = -netCost;
  for (let t = 1; t <= NPV_ANALYSIS_PERIOD_YEARS; t++) {
    const deg = Math.pow(1 - DEGRADATION_RATE, t - 1);
    const esc = Math.pow(1 + escalationRate, t);
    const disc = Math.pow(1 + NPV_DISCOUNT_RATE, t);

    const selfValue = selfConsumedKwh * deg * effectiveRate * esc;
    const exportValue = exportedKwh * deg * nmCreditRate * esc;

    npv += (selfValue + exportValue) / disc;
  }
  return npv;
}

// ---------------------------------------------------------------------------
// Peak Demand Estimation (BESS-ready)
// ---------------------------------------------------------------------------

export function estimatePeakDemand(
  annualKwh: number,
  buildingTypeId: string
): number {
  const config = getSolarBuildingConfig(buildingTypeId);
  const loadFactor = config.loadFactor;
  const averageDemandKw = annualKwh / 8760;
  return averageDemandKw / loadFactor;
}

// ---------------------------------------------------------------------------
// Confidence Level
// ---------------------------------------------------------------------------

function determineConfidence(
  input: SolarCalculationInput
): SolarConfidence {
  // RED conditions
  if (input.buildingTypeId === "data_center") return "red";
  if (input.buildingTypeId === "other") return "red";
  if (input.buildingSizeSqft < SMALL_BUILDING_SQFT) return "red";
  if (input.euiValidationWarning) return "red";

  // GREEN conditions
  const greenTypes = [
    "warehouse",
    "warehouse_cold",
    "manufacturing",
    "manufacturing_food",
    "grocery",
  ];
  if (
    greenTypes.includes(input.buildingTypeId) &&
    input.completionPath === "enhanced" &&
    !input.euiValidationWarning
  ) {
    return "green";
  }

  // YELLOW — everything else
  return "yellow";
}

function getConfidenceNote(confidence: SolarConfidence): string {
  switch (confidence) {
    case "green":
      return "Based on your specific energy data and building characteristics";
    case "yellow":
      return "Uses typical values for your building type. Actual generation may differ.";
    case "red":
      return "Rough screening estimate — recommend Tier 3 analysis for detailed assessment.";
  }
}

// ---------------------------------------------------------------------------
// Greenhouse — Not Suitable (Gate Check)
// ---------------------------------------------------------------------------

function createGreenhouseResult(): SolarCalculationResult {
  const emptyPathway: SolarPathwayResult = {
    systemKw: 0,
    systemKwRounded: 0,
    annualGenerationKwh: 0,
    selfConsumedKwh: 0,
    exportedOrWastedKwh: 0,
    selfConsumptionPct: 0,
    annualDollarSavings: 0,
    costMidpoint: 0,
    costUpper: 0,
    costLabel: "",
    incentiveLow: 0,
    incentiveHigh: 0,
    incentiveSoe: 0,
    incentiveCtItc: 0,
    netCostMidpoint: 0,
    netCostUpper: 0,
    paybackMidpoint: null,
    paybackUpper: null,
    npvConservative: 0,
    npvBase: 0,
    npvHigh: 0,
    offsetPct: 0,
  };

  return {
    solarShowCard: false,
    greenhouseNote:
      "Rooftop solar is not suitable for greenhouse structures " +
      "due to structural limitations and light transmission requirements. " +
      "Ground-mount solar may be viable — see Tier 3.",
    irradianceZone: "central_on",
    zoneIrradiance: 0,
    effectiveIrradiance: 0,
    roofFootprintSqft: 0,
    availableRoofSqft: 0,
    roofConstrainedKw: 0,
    btmConstrainedKw: 0,
    nmConstrainedKw: 0,
    btm: emptyPathway,
    nm: emptyPathway,
    recommendedPathway: "btm",
    recommended: emptyPathway,
    demandChargeSavings: 0,
    demandNote: "",
    classANote: null,
    co2ReductionTonnes: 0,
    carsEquivalent: 0,
    solarExcessGenerationKwh: 0,
    solarSelfConsumptionRatio: 0,
    solarPeakDemandKw: 0,
    solarMonthlyGenerationKwh: new Array(12).fill(0),
    nmCreditRate: 0,
    nmSelfConsumptionPct: 0,
    effectiveRateUsed: 0,
    rateClassUsed: "",
    completionPathUsed: "",
    storefFactorUsed: 0,
    roofUtilizationUsed: 0,
    baseloadPctUsed: 0,
    confidence: "red",
    confidenceNote: "Not applicable for this building type.",
    flags: [
      {
        type: "edge_case",
        message:
          "Rooftop solar is not suitable for greenhouse structures " +
          "due to structural limitations and light transmission requirements. " +
          "Ground-mount solar may be viable — see Tier 3.",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
