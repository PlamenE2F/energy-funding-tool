/**
 * Database Seed Script — Ontario Rate Configuration Data
 *
 * Populates jurisdiction_config, rate_class_config, and tou_period_config
 * tables with Ontario electricity rate data.
 *
 * Sources:
 *   - OEB RPP rates effective November 1, 2025
 *   - Toronto Hydro business rates effective January 1, 2026
 *   - IESO Global Adjustment and Class A eligibility rules
 *
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Ontario rate configuration data...");

  // -------------------------------------------------------------------
  // 1. Jurisdiction Config
  // -------------------------------------------------------------------

  await prisma.jurisdictionConfig.upsert({
    where: { jurisdictionId: "ON" },
    update: {},
    create: {
      jurisdictionId: "ON",
      jurisdictionName: "Ontario",
      country: "CA",
      currency: "CAD",
      areaUnit: "sqft",
      energyUnit: "kWh",
      gasUnit: "m3",
      taxRate: 0.13,
      rebateName: "Ontario Electricity Rebate",
      rebateRate: 0.235,
      rebateEligibleClasses: ["rpp_tou", "rpp_ulo", "rpp_tiered"],
      effectiveDate: new Date("2025-11-01"),
    },
  });

  console.log("  ✓ Ontario jurisdiction config");

  // -------------------------------------------------------------------
  // 2. Rate Class Configs
  // -------------------------------------------------------------------

  const rateClasses = [
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
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
      demandChargeRate: 17.84,
      effectiveDate: new Date("2026-01-01"),
      sourceReference:
        "Toronto Hydro GS 50–999 kW rates effective Jan 1, 2026",
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
      demandChargeRate: 15.9,
      effectiveDate: new Date("2026-01-01"),
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
      effectiveDate: new Date("2026-01-01"),
      sourceReference: "IESO Class A eligibility and GA methodology",
    },
  ];

  for (const rc of rateClasses) {
    await prisma.rateClassConfig.upsert({
      where: {
        jurisdictionId_rateClassId: {
          jurisdictionId: rc.jurisdictionId,
          rateClassId: rc.rateClassId,
        },
      },
      update: rc,
      create: rc,
    });
  }

  console.log(`  ✓ ${rateClasses.length} rate class configs`);

  // -------------------------------------------------------------------
  // 3. TOU Period Configs
  // -------------------------------------------------------------------

  // Clear existing TOU periods for ON to avoid duplicates
  await prisma.touPeriodConfig.deleteMany({
    where: { jurisdictionId: "ON" },
  });

  const touPeriods = [
    // TOU Winter
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
    },
    // TOU Summer
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
    },
    // ULO
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
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
      effectiveDate: new Date("2025-11-01"),
    },
  ];

  await prisma.touPeriodConfig.createMany({ data: touPeriods });

  console.log(`  ✓ ${touPeriods.length} TOU period configs`);

  // -------------------------------------------------------------------
  // 4. Building Type Configs (16 canonical types)
  // -------------------------------------------------------------------

  const buildingTypes = [
    { buildingTypeId: "office", buildingTypeName: "Office", benchmarkSource: "SCIEU 2019 — Office (excl. medical)", benchmarkEuiGjM2: 0.87, benchmarkEuiKwhSqft: 22.5, electricityFraction: 0.60, benchmarkClassification: "green", energyStarEligible: true, benchmarkCaveatText: null, loadFactor: 0.45 },
    { buildingTypeId: "warehouse", buildingTypeName: "Warehouse (Dry Storage)", benchmarkSource: "SCIEU 2019 — Warehouse", benchmarkEuiGjM2: 0.72, benchmarkEuiKwhSqft: 18.6, electricityFraction: 0.50, benchmarkClassification: "green", energyStarEligible: true, benchmarkCaveatText: null, loadFactor: 0.35 },
    { buildingTypeId: "warehouse_cold", buildingTypeName: "Warehouse (Cold Storage)", benchmarkSource: "SCIEU 2019 — Warehouse (proxy)", benchmarkEuiGjM2: 0.72, benchmarkEuiKwhSqft: 18.6, electricityFraction: 0.85, benchmarkClassification: "yellow", energyStarEligible: false, benchmarkCaveatText: "This benchmark reflects typical dry warehousing. Cold storage facilities typically use significantly more energy due to refrigeration loads.", loadFactor: 0.35 },
    { buildingTypeId: "manufacturing", buildingTypeName: "Manufacturing (Light)", benchmarkSource: "SCIEU 2019 — Warehouse (proxy)", benchmarkEuiGjM2: 0.72, benchmarkEuiKwhSqft: 18.6, electricityFraction: 0.55, benchmarkClassification: "yellow", energyStarEligible: false, benchmarkCaveatText: "Using warehouse benchmark as proxy — manufacturing process loads may increase energy use significantly beyond this reference.", loadFactor: 0.55 },
    { buildingTypeId: "manufacturing_food", buildingTypeName: "Manufacturing (Food)", benchmarkSource: "SCIEU 2019 — Restaurant (proxy)", benchmarkEuiGjM2: 1.28, benchmarkEuiKwhSqft: 33.1, electricityFraction: 0.50, benchmarkClassification: "yellow", energyStarEligible: false, benchmarkCaveatText: "Using approximate benchmark — food processing energy profiles vary widely based on scale and process type.", loadFactor: 0.55 },
    { buildingTypeId: "retail", buildingTypeName: "Retail", benchmarkSource: "SCIEU 2019 — Retail (non-food)", benchmarkEuiGjM2: 0.85, benchmarkEuiKwhSqft: 22.0, electricityFraction: 0.65, benchmarkClassification: "green", energyStarEligible: true, benchmarkCaveatText: null, loadFactor: 0.40 },
    { buildingTypeId: "restaurant", buildingTypeName: "Food Service / Restaurant", benchmarkSource: "SCIEU 2019 — Restaurant", benchmarkEuiGjM2: 1.28, benchmarkEuiKwhSqft: 33.1, electricityFraction: 0.45, benchmarkClassification: "green", energyStarEligible: false, benchmarkCaveatText: null, loadFactor: 0.45 },
    { buildingTypeId: "medical_office", buildingTypeName: "Healthcare / Medical", benchmarkSource: "SCIEU 2019 — Medical office", benchmarkEuiGjM2: 0.74, benchmarkEuiKwhSqft: 19.1, electricityFraction: 0.60, benchmarkClassification: "green", energyStarEligible: true, benchmarkCaveatText: null, loadFactor: 0.40 },
    { buildingTypeId: "school", buildingTypeName: "Education", benchmarkSource: "SCIEU 2019 — Primary/secondary", benchmarkEuiGjM2: 0.70, benchmarkEuiKwhSqft: 18.1, electricityFraction: 0.45, benchmarkClassification: "green", energyStarEligible: true, benchmarkCaveatText: null, loadFactor: 0.30 },
    { buildingTypeId: "data_center", buildingTypeName: "Data Center", benchmarkSource: null, benchmarkEuiGjM2: null, benchmarkEuiKwhSqft: null, electricityFraction: 0.95, benchmarkClassification: "red", energyStarEligible: false, benchmarkCaveatText: null, loadFactor: 0.80 },
    { buildingTypeId: "agriculture", buildingTypeName: "Agriculture (Traditional)", benchmarkSource: null, benchmarkEuiGjM2: null, benchmarkEuiKwhSqft: null, electricityFraction: 0.50, benchmarkClassification: "red", energyStarEligible: false, benchmarkCaveatText: null, loadFactor: 0.40 },
    { buildingTypeId: "greenhouse", buildingTypeName: "Agriculture (Greenhouse)", benchmarkSource: null, benchmarkEuiGjM2: null, benchmarkEuiKwhSqft: null, electricityFraction: 0.60, benchmarkClassification: "red", energyStarEligible: false, benchmarkCaveatText: null, loadFactor: 0.50 },
    { buildingTypeId: "multifamily", buildingTypeName: "Multi-Residential", benchmarkSource: "SECMURBs 2018", benchmarkEuiGjM2: 0.82, benchmarkEuiKwhSqft: 21.2, electricityFraction: 0.45, benchmarkClassification: "green", energyStarEligible: true, benchmarkCaveatText: null, loadFactor: 0.45 },
    { buildingTypeId: "hotel", buildingTypeName: "Hotel / Hospitality", benchmarkSource: "SCIEU 2019 — Hotel/motel", benchmarkEuiGjM2: 0.87, benchmarkEuiKwhSqft: 22.5, electricityFraction: 0.50, benchmarkClassification: "green", energyStarEligible: true, benchmarkCaveatText: null, loadFactor: 0.50 },
    { buildingTypeId: "grocery", buildingTypeName: "Grocery / Supermarket", benchmarkSource: "SCIEU 2019 — Food/beverage store", benchmarkEuiGjM2: 1.07, benchmarkEuiKwhSqft: 27.7, electricityFraction: 0.75, benchmarkClassification: "green", energyStarEligible: true, benchmarkCaveatText: null, loadFactor: 0.55 },
    { buildingTypeId: "other", buildingTypeName: "Other Commercial", benchmarkSource: "SCIEU 2019 — Others Inscope", benchmarkEuiGjM2: 0.86, benchmarkEuiKwhSqft: 22.2, electricityFraction: 0.55, benchmarkClassification: "red", energyStarEligible: false, benchmarkCaveatText: null, loadFactor: 0.40 },
  ];

  for (const bt of buildingTypes) {
    await prisma.buildingTypeConfig.upsert({
      where: { buildingTypeId: bt.buildingTypeId },
      update: bt,
      create: bt,
    });
  }

  console.log(`  ✓ ${buildingTypes.length} building type configs`);

  // -------------------------------------------------------------------
  // 5. Fuel Type Configs (ECCC V3.0)
  // -------------------------------------------------------------------

  const fuelTypes = [
    { fuelTypeId: "natural_gas", fuelTypeName: "Natural Gas", conversionFactorKwh: 10.55, unit: "m3", emissionFactorCo2: 1921, emissionFactorCh4: 0.037, emissionFactorN2o: 0.035, emissionFactorTotal: 1932, gwpCh4: 25, gwpN2o: 298, emissionFactorSource: "ECCC V3.0 Tables 1.3/2.3/3.3/4.3", sourceSiteRatio: 1.02, effectiveDate: new Date("2025-10-01") },
    { fuelTypeId: "fuel_oil", fuelTypeName: "Fuel Oil (#2)", conversionFactorKwh: 10.74, unit: "litre", emissionFactorCo2: 2753, emissionFactorCh4: 0.026, emissionFactorN2o: 0.031, emissionFactorTotal: 2763, gwpCh4: 25, gwpN2o: 298, emissionFactorSource: "ECCC V3.0 Tables 1.3/2.3/3.3/4.3", sourceSiteRatio: 1.01, effectiveDate: new Date("2025-10-01") },
    { fuelTypeId: "propane", fuelTypeName: "Propane", conversionFactorKwh: 7.08, unit: "litre", emissionFactorCo2: 1515, emissionFactorCh4: 0.024, emissionFactorN2o: 0.108, emissionFactorTotal: 1548, gwpCh4: 25, gwpN2o: 298, emissionFactorSource: "ECCC V3.0 Tables 1.3/2.3/3.3/4.3", sourceSiteRatio: 1.01, effectiveDate: new Date("2025-10-01") },
  ];

  for (const ft of fuelTypes) {
    await prisma.fuelTypeConfig.upsert({
      where: { fuelTypeId: ft.fuelTypeId },
      update: ft,
      create: ft,
    });
  }

  console.log(`  ✓ ${fuelTypes.length} fuel type configs`);

  // -------------------------------------------------------------------
  // 6. Update Ontario jurisdiction with emission factors
  // -------------------------------------------------------------------

  await prisma.jurisdictionConfig.update({
    where: { jurisdictionId: "ON" },
    data: {
      scope2AverageFactor: 59,
      scope2AverageFactorYear: 2026,
      sourceSiteRatioElectricity: 2.05,
      sourceSiteRatioFuel: 1.02,
      benchmarkCostRateElectric: 0.13,
      benchmarkCostRateGas: 0.35,
      carbonPricePerTonne: null,
      carbonPriceEffectiveDate: null,
      carbonPriceSource: null,
    },
  });

  console.log("  ✓ Ontario jurisdiction emission factors updated");

  // -------------------------------------------------------------------
  // 7. Lighting Technology Configs (LED Measure)
  // -------------------------------------------------------------------

  const lightingTechnologies = [
    { lightingTypeId: "fluorescent_t12", displayName: "Fluorescent (T12)", savingsVsLedPct: 0.60, hidLightingShareAdjustment: 0 },
    { lightingTypeId: "fluorescent_t8", displayName: "Fluorescent (T8/T5)", savingsVsLedPct: 0.40, hidLightingShareAdjustment: 0 },
    { lightingTypeId: "hid", displayName: "HID (Metal Halide / HPS)", savingsVsLedPct: 0.60, hidLightingShareAdjustment: 0.10 },
    { lightingTypeId: "mixed", displayName: "Mixed (various types)", savingsVsLedPct: 0.35, hidLightingShareAdjustment: 0 },
    { lightingTypeId: "unknown", displayName: "Unknown", savingsVsLedPct: 0.35, hidLightingShareAdjustment: 0 },
    { lightingTypeId: "led", displayName: "LED (already upgraded)", savingsVsLedPct: 0, hidLightingShareAdjustment: 0 },
  ];

  for (const lt of lightingTechnologies) {
    await prisma.lightingTechnologyConfig.upsert({
      where: { lightingTypeId: lt.lightingTypeId },
      update: lt,
      create: lt,
    });
  }

  console.log(`  ✓ ${lightingTechnologies.length} lighting technology configs`);

  // -------------------------------------------------------------------
  // 8. Update Building Types with LED Measure Config
  // -------------------------------------------------------------------

  const ledBuildingUpdates: Record<string, { ledLightingSharePct: number; ledCostMidpointPerSqft: number; ledCostUpperPerSqft: number; ledMeasureApplicable: boolean; ledMeasureNote: string | null }> = {
    office: { ledLightingSharePct: 0.30, ledCostMidpointPerSqft: 2.00, ledCostUpperPerSqft: 3.50, ledMeasureApplicable: true, ledMeasureNote: null },
    warehouse: { ledLightingSharePct: 0.20, ledCostMidpointPerSqft: 1.50, ledCostUpperPerSqft: 3.00, ledMeasureApplicable: true, ledMeasureNote: null },
    warehouse_cold: { ledLightingSharePct: 0.14, ledCostMidpointPerSqft: 2.00, ledCostUpperPerSqft: 3.50, ledMeasureApplicable: true, ledMeasureNote: null },
    manufacturing: { ledLightingSharePct: 0.15, ledCostMidpointPerSqft: 1.50, ledCostUpperPerSqft: 3.00, ledMeasureApplicable: true, ledMeasureNote: null },
    manufacturing_food: { ledLightingSharePct: 0.12, ledCostMidpointPerSqft: 2.00, ledCostUpperPerSqft: 3.50, ledMeasureApplicable: true, ledMeasureNote: null },
    retail: { ledLightingSharePct: 0.35, ledCostMidpointPerSqft: 2.50, ledCostUpperPerSqft: 4.50, ledMeasureApplicable: true, ledMeasureNote: null },
    restaurant: { ledLightingSharePct: 0.12, ledCostMidpointPerSqft: 2.50, ledCostUpperPerSqft: 4.00, ledMeasureApplicable: true, ledMeasureNote: null },
    medical_office: { ledLightingSharePct: 0.20, ledCostMidpointPerSqft: 2.50, ledCostUpperPerSqft: 4.00, ledMeasureApplicable: true, ledMeasureNote: null },
    school: { ledLightingSharePct: 0.30, ledCostMidpointPerSqft: 2.00, ledCostUpperPerSqft: 3.50, ledMeasureApplicable: true, ledMeasureNote: null },
    data_center: { ledLightingSharePct: 0.03, ledCostMidpointPerSqft: 1.00, ledCostUpperPerSqft: 2.00, ledMeasureApplicable: true, ledMeasureNote: "Lighting is a small fraction of your energy use. Other efficiency measures will have greater impact for this building type." },
    agriculture: { ledLightingSharePct: 0.10, ledCostMidpointPerSqft: 1.00, ledCostUpperPerSqft: 2.50, ledMeasureApplicable: true, ledMeasureNote: null },
    greenhouse: { ledLightingSharePct: 0.45, ledCostMidpointPerSqft: 0, ledCostUpperPerSqft: 0, ledMeasureApplicable: false, ledMeasureNote: "Specialized horticultural lighting requires a different approach. Contact a horticultural lighting specialist. SaveOnEnergy offers greenhouse-specific measures." },
    multifamily: { ledLightingSharePct: 0.25, ledCostMidpointPerSqft: 2.00, ledCostUpperPerSqft: 3.50, ledMeasureApplicable: true, ledMeasureNote: null },
    hotel: { ledLightingSharePct: 0.20, ledCostMidpointPerSqft: 2.50, ledCostUpperPerSqft: 4.50, ledMeasureApplicable: true, ledMeasureNote: null },
    grocery: { ledLightingSharePct: 0.20, ledCostMidpointPerSqft: 2.00, ledCostUpperPerSqft: 3.50, ledMeasureApplicable: true, ledMeasureNote: null },
    other: { ledLightingSharePct: 0.25, ledCostMidpointPerSqft: 2.00, ledCostUpperPerSqft: 3.50, ledMeasureApplicable: true, ledMeasureNote: null },
  };

  for (const [buildingTypeId, ledConfig] of Object.entries(ledBuildingUpdates)) {
    await prisma.buildingTypeConfig.update({
      where: { buildingTypeId },
      data: ledConfig,
    });
  }

  console.log(`  ✓ ${Object.keys(ledBuildingUpdates).length} building types updated with LED config`);

  // -------------------------------------------------------------------
  // 9. Update Building Types with HVAC Measure Config
  // -------------------------------------------------------------------

  const hvacBuildingUpdates: Record<string, { hvacElectricPct: number; hvacGasPct: number; hvacMeasureApplicable: boolean; hvacMeasureNote: string | null }> = {
    office: { hvacElectricPct: 0.30, hvacGasPct: 0.85, hvacMeasureApplicable: true, hvacMeasureNote: null },
    warehouse: { hvacElectricPct: 0.15, hvacGasPct: 0.90, hvacMeasureApplicable: true, hvacMeasureNote: null },
    warehouse_cold: { hvacElectricPct: 0.50, hvacGasPct: 0.80, hvacMeasureApplicable: true, hvacMeasureNote: null },
    manufacturing: { hvacElectricPct: 0.25, hvacGasPct: 0.75, hvacMeasureApplicable: true, hvacMeasureNote: null },
    manufacturing_food: { hvacElectricPct: 0.35, hvacGasPct: 0.55, hvacMeasureApplicable: true, hvacMeasureNote: null },
    retail: { hvacElectricPct: 0.30, hvacGasPct: 0.85, hvacMeasureApplicable: true, hvacMeasureNote: null },
    restaurant: { hvacElectricPct: 0.20, hvacGasPct: 0.40, hvacMeasureApplicable: true, hvacMeasureNote: null },
    medical_office: { hvacElectricPct: 0.35, hvacGasPct: 0.70, hvacMeasureApplicable: true, hvacMeasureNote: null },
    school: { hvacElectricPct: 0.25, hvacGasPct: 0.85, hvacMeasureApplicable: true, hvacMeasureNote: null },
    data_center: { hvacElectricPct: 0.35, hvacGasPct: 0.10, hvacMeasureApplicable: true, hvacMeasureNote: "Data center HVAC is cooling-dominated. A Tier 3 analysis with specialized cooling engineering is recommended." },
    agriculture: { hvacElectricPct: 0.20, hvacGasPct: 0.80, hvacMeasureApplicable: true, hvacMeasureNote: null },
    greenhouse: { hvacElectricPct: 0.30, hvacGasPct: 0.90, hvacMeasureApplicable: true, hvacMeasureNote: "Greenhouse HVAC requires crop-specific analysis. Standard calculations may not reflect actual heating/cooling requirements." },
    multifamily: { hvacElectricPct: 0.20, hvacGasPct: 0.65, hvacMeasureApplicable: true, hvacMeasureNote: null },
    hotel: { hvacElectricPct: 0.30, hvacGasPct: 0.60, hvacMeasureApplicable: true, hvacMeasureNote: null },
    grocery: { hvacElectricPct: 0.15, hvacGasPct: 0.80, hvacMeasureApplicable: true, hvacMeasureNote: null },
    other: { hvacElectricPct: 0.25, hvacGasPct: 0.75, hvacMeasureApplicable: true, hvacMeasureNote: null },
  };

  for (const [buildingTypeId, hvacConfig] of Object.entries(hvacBuildingUpdates)) {
    await prisma.buildingTypeConfig.update({
      where: { buildingTypeId },
      data: hvacConfig,
    });
  }

  console.log(`  ✓ ${Object.keys(hvacBuildingUpdates).length} building types updated with HVAC config`);

  console.log("\nOntario configuration seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
