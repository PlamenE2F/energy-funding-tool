/**
 * Rate Structure Dropdown — Tier 2 Assessment Form
 *
 * Position: after annual electricity cost (R6)
 * Optional field — not required
 * 6 options from spec Section 5.3
 *
 * Shows a soft warning when user selects RPP but estimated peak > 60 kW.
 */

"use client";

import { useState } from "react";
import type { RateStructureOption } from "@/lib/rates/types";

// ---------------------------------------------------------------------------
// Dropdown Options (spec Section 5.3)
// ---------------------------------------------------------------------------

interface RateStructureOptionDef {
  value: RateStructureOption;
  label: string;
  helpText: string;
}

const RATE_STRUCTURE_OPTIONS: RateStructureOptionDef[] = [
  {
    value: "rpp_tou",
    label: "Time-of-Use (TOU)",
    helpText:
      "Your bill shows Off-Peak, Mid-Peak, and On-Peak rates",
  },
  {
    value: "rpp_ulo",
    label: "Ultra-Low Overnight (ULO)",
    helpText: "Your bill shows an Ultra-Low Overnight rate",
  },
  {
    value: "rpp_tiered",
    label: "Tiered",
    helpText: "Your bill shows Tier 1 and Tier 2 rates",
  },
  {
    value: "spot_market",
    label: "Ontario Market Price + Global Adjustment",
    helpText:
      "Your bill shows hourly market price and a separate Global Adjustment line",
  },
  {
    value: "retailer_contract",
    label: "Retailer contract (fixed or variable)",
    helpText:
      "Your bill shows a contracted rate from a licensed electricity retailer",
  },
  {
    value: "dont_know",
    label: "Not sure",
    helpText: "We'll estimate from your building profile",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RateStructureSelectProps {
  value: RateStructureOption | null;
  onChange: (value: RateStructureOption | null) => void;
  estimatedPeakKw?: number;
}

export function RateStructureSelect({
  value,
  onChange,
  estimatedPeakKw,
}: RateStructureSelectProps) {
  const [showHelp, setShowHelp] = useState(false);

  // Soft warning: RPP selected but peak > 60 kW
  const isRppSelected =
    value === "rpp_tou" || value === "rpp_ulo" || value === "rpp_tiered";
  const showPeakWarning =
    isRppSelected && estimatedPeakKw !== undefined && estimatedPeakKw > 60;

  const selectedOption = RATE_STRUCTURE_OPTIONS.find((o) => o.value === value);

  return (
    <div className="vm-field-group">
      <label
        htmlFor="rate-structure"
        className="block text-sm font-medium"
        style={{ color: "var(--vm-gray-700)" }}
      >
        Rate structure{" "}
        <span
          className="text-sm font-normal"
          style={{ color: "var(--vm-gray-400)" }}
        >
          (optional)
        </span>
      </label>

      <p
        className="mt-1 text-sm"
        style={{ color: "var(--vm-gray-500)" }}
      >
        How is your electricity billed? This helps us calculate more accurate
        savings.
      </p>

      <select
        id="rate-structure"
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value ? (e.target.value as RateStructureOption) : null
          )
        }
        className="mt-2 block w-full rounded-lg border px-3 py-2 text-sm"
        style={{
          borderColor: "var(--vm-gray-300)",
          backgroundColor: "var(--vm-white)",
          color: "var(--vm-gray-800)",
        }}
      >
        <option value="">Select your rate structure...</option>
        {RATE_STRUCTURE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Help text for selected option */}
      {selectedOption && (
        <p
          className="mt-1.5 text-xs"
          style={{ color: "var(--vm-gray-500)" }}
        >
          {selectedOption.helpText}
        </p>
      )}

      {/* Expandable help */}
      <button
        type="button"
        onClick={() => setShowHelp(!showHelp)}
        className="mt-2 text-xs underline"
        style={{ color: "var(--vm-info)" }}
      >
        {showHelp ? "Hide" : "How do I find this on my bill?"}
      </button>

      {showHelp && (
        <div
          className="mt-2 rounded-lg p-3 text-xs"
          style={{
            backgroundColor: "var(--vm-gray-50)",
            border: "1px solid var(--vm-gray-200)",
            color: "var(--vm-gray-600)",
          }}
        >
          <p className="font-medium mb-1">Look at your electricity bill for:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Off-Peak / Mid-Peak / On-Peak</strong> rates → Time-of-Use
            </li>
            <li>
              <strong>Ultra-Low Overnight</strong> rate → ULO
            </li>
            <li>
              <strong>Tier 1 / Tier 2</strong> rates → Tiered
            </li>
            <li>
              <strong>Global Adjustment</strong> as a separate line →
              Market Price + GA
            </li>
            <li>
              A fixed ¢/kWh rate from a named retailer → Retailer contract
            </li>
          </ul>
        </div>
      )}

      {/* Soft warning for RPP + high peak demand */}
      {showPeakWarning && (
        <div
          className="mt-3 rounded-lg p-3 text-sm"
          style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid var(--vm-amber)",
            color: "#92400E",
          }}
        >
          <p>
            Buildings with peak demand above 50 kW are typically on spot market
            pricing. You may want to check your bill — look for
            &ldquo;Global Adjustment&rdquo; as a separate line item.
          </p>
        </div>
      )}
    </div>
  );
}

export { RATE_STRUCTURE_OPTIONS };
export type { RateStructureOptionDef };
