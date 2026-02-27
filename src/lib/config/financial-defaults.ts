/**
 * Shared Financial Defaults — All Measure Cards
 *
 * NPV parameters, rate escalation scenarios, and SaveOnEnergy incentive rates
 * shared across LED, HVAC, and all future measure cards.
 *
 * Extracted from LED config per HANDOFF.md guidance.
 *
 * Sources:
 *   - SaveOnEnergy Retrofit Program (June 2025) — custom stream
 *   - Enbridge Gas Commercial Custom Retrofit (2026)
 *   - CRA Clean Technology ITC (2023–2034)
 *   - OEB gas rate decision EB-2025-0308
 */

// ---------------------------------------------------------------------------
// NPV Parameters (shared across all measure cards)
// ---------------------------------------------------------------------------

/** NPV discount rate — disclosed in footnote */
export const NPV_DISCOUNT_RATE = 0.06;

/** NPV analysis period in years */
export const NPV_ANALYSIS_PERIOD_YEARS = 10;

// ---------------------------------------------------------------------------
// Electricity Rate Escalation Scenarios
// ---------------------------------------------------------------------------

/** Rate escalation scenarios (matches rate framework approved decision #3) */
export const RATE_ESCALATION_CONSERVATIVE = 0.02;
export const RATE_ESCALATION_BASE = 0.025;
export const RATE_ESCALATION_HIGH = 0.045;

// ---------------------------------------------------------------------------
// Gas Rate Escalation Scenarios (HVAC + future gas measures)
// ---------------------------------------------------------------------------

/** Gas historically stable — no active carbon pricing post-April 2025 */
export const GAS_ESCALATION_CONSERVATIVE = 0.02;

/** Base case: commodity + distribution, no carbon pricing */
export const GAS_ESCALATION_BASE = 0.02;

/** High: potential carbon pricing reinstatement, declining gas customer base */
export const GAS_ESCALATION_HIGH = 0.03;

// ---------------------------------------------------------------------------
// SaveOnEnergy Incentive Config (electricity-saving measures)
// ---------------------------------------------------------------------------

/** $/kWh saved — SaveOnEnergy Custom stream (June 2025) */
export const SOE_CUSTOM_RATE_KWH = 0.20;

/** $/kW demand reduction — SaveOnEnergy Custom stream */
export const SOE_CUSTOM_RATE_KW = 1800;

/** Cap: 50% of eligible project costs */
export const SOE_CAP_PCT = 0.50;

// ---------------------------------------------------------------------------
// Enbridge Gas Incentive Config (gas-saving measures)
// ---------------------------------------------------------------------------

/** Standard custom retrofit rate ($/m³ gas saved) */
export const ENBRIDGE_CUSTOM_RATE_STANDARD = 0.40;

/** Enhanced rate for qualifying projects ($/m³) */
export const ENBRIDGE_CUSTOM_RATE_ENHANCED = 1.20;

/** Enbridge cap: 75% of project cost */
export const ENBRIDGE_CAP_PCT = 0.75;

/** Enbridge max per project */
export const ENBRIDGE_MAX_PER_PROJECT = 100_000;

// ---------------------------------------------------------------------------
// Federal Clean Technology Investment Tax Credit
// ---------------------------------------------------------------------------

/** CT ITC rate — full (30%) with prevailing wage compliance */
export const CT_ITC_RATE = 0.30;

/** CT ITC reduced rate (20%) without prevailing wage */
export const CT_ITC_REDUCED_RATE = 0.20;

// ---------------------------------------------------------------------------
// NRCan Oil-to-Heat-Pump Affordability Program
// ---------------------------------------------------------------------------

/** OHPA flat incentive amount */
export const OHPA_FLAT_AMOUNT = 10_000;
