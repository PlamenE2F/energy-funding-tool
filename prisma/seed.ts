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

  console.log("\nOntario rate configuration seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
