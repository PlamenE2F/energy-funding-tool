/**
 * Emissions Display Component
 *
 * Shows total carbon footprint as headline number.
 * Scope 1/2 breakdown in expandable detail view.
 *
 * Display logic:
 *   Electricity only → Scope 2 only + note about missing Scope 1
 *   Electricity + gas → Scope 1 + Scope 2 + Total
 */

"use client";

import { useState } from "react";
import type { EmissionsResult } from "@/lib/eui/types";

interface EmissionsDisplayProps {
  emissions: EmissionsResult;
}

export function EmissionsDisplay({ emissions }: EmissionsDisplayProps) {
  const [showDetail, setShowDetail] = useState(false);
  const hasScope1 =
    emissions.scope1Tonnes !== null && !emissions.scope1CalculatedFromEstimate;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--vm-gray-700)" }}
        >
          Carbon Emissions
        </h3>
        <button
          type="button"
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs underline"
          style={{ color: "var(--vm-info)" }}
        >
          {showDetail ? "Hide breakdown" : "Show breakdown"}
        </button>
      </div>

      {showDetail && (
        <div
          className="mt-3 rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--vm-gray-200)" }}
        >
          <table className="w-full text-sm">
            <tbody>
              {/* Scope 2 — always shown */}
              <tr style={{ backgroundColor: "var(--vm-gray-50)" }}>
                <td className="px-4 py-2" style={{ color: "var(--vm-gray-600)" }}>
                  Scope 2 (Grid Electricity)
                </td>
                <td
                  className="px-4 py-2 text-right font-medium"
                  style={{ color: "var(--vm-gray-700)" }}
                >
                  {emissions.scope2Tonnes.toFixed(1)} tonnes CO₂eq/yr
                </td>
              </tr>

              {/* Scope 1 — only when actual fuel data */}
              {hasScope1 && (
                <tr style={{ borderTop: "1px solid var(--vm-gray-100)" }}>
                  <td
                    className="px-4 py-2"
                    style={{ color: "var(--vm-gray-600)" }}
                  >
                    Scope 1 (Fuel Combustion)
                  </td>
                  <td
                    className="px-4 py-2 text-right font-medium"
                    style={{ color: "var(--vm-gray-700)" }}
                  >
                    {emissions.scope1Tonnes!.toFixed(1)} tonnes CO₂eq/yr
                  </td>
                </tr>
              )}

              {/* Total */}
              <tr
                style={{
                  borderTop: "1px solid var(--vm-gray-200)",
                  backgroundColor: "var(--vm-gray-50)",
                }}
              >
                <td
                  className="px-4 py-2 font-semibold"
                  style={{ color: "var(--vm-navy)" }}
                >
                  Total
                </td>
                <td
                  className="px-4 py-2 text-right font-bold"
                  style={{ color: "var(--vm-navy)" }}
                >
                  {emissions.totalEmissionsTonnes.toFixed(1)} tonnes CO₂eq/yr
                </td>
              </tr>
            </tbody>
          </table>

          <p
            className="px-4 py-2 text-xs"
            style={{
              color: "var(--vm-gray-400)",
              backgroundColor: "var(--vm-gray-50)",
              borderTop: "1px solid var(--vm-gray-100)",
            }}
          >
            Electricity: {emissions.scope2AverageFactor} gCO₂eq/kWh (ECCC V3.0,{" "}
            {emissions.scope2AverageFactorYear})
          </p>
        </div>
      )}

      {/* Note when Scope 1 is missing */}
      {!hasScope1 && (
        <p className="mt-2 text-xs" style={{ color: "var(--vm-gray-400)" }}>
          Scope 1 emissions from heating fuel not included — add gas data for
          complete carbon footprint
        </p>
      )}
    </div>
  );
}
