/**
 * Gas Data Nudge Banner
 *
 * Positioned between Energy Profile Snapshot and Measure Cards.
 * This is the ONLY inline prompt — approved exception from the
 * "collapsible panel at end" rule because gas data materially
 * changes the entire assessment.
 *
 * Only shown when gas data is NOT provided (Fast path).
 */

"use client";

interface GasNudgeBannerProps {
  /** Whether gas data has been provided */
  hasGasData: boolean;
  /** Callback when user wants to add gas data */
  onAddGasData?: () => void;
}

export function GasNudgeBanner({
  hasGasData,
  onAddGasData,
}: GasNudgeBannerProps) {
  if (hasGasData) return null;

  return (
    <div
      className="rounded-xl p-4 my-6 flex items-start gap-3"
      style={{
        backgroundColor: "#EFF6FF",
        border: "1px solid #BFDBFE",
      }}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          backgroundColor: "#DBEAFE",
          color: "#1E40AF",
        }}
      >
        +
      </div>
      <div className="flex-1">
        <p
          className="text-sm font-medium"
          style={{ color: "#1E40AF" }}
        >
          Add your natural gas data for a complete energy picture
        </p>
        <p className="text-sm mt-1" style={{ color: "#3B82F6" }}>
          Gas heating typically accounts for 40–60% of total building energy
          in Ontario. Adding your annual gas consumption enables total site
          EUI, Scope 1 emissions, and more accurate measure recommendations.
        </p>
        {onAddGasData && (
          <button
            type="button"
            onClick={onAddGasData}
            className="mt-2 inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: "var(--vm-green-cta)",
              color: "var(--vm-white)",
            }}
          >
            Add gas data
          </button>
        )}
      </div>
    </div>
  );
}
