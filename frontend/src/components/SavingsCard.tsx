import { useEffect, useRef, useState } from "react";
import { useAgentStore } from "../store/agentStore";

// ── Extract net savings from a specialist recommendation ──────────────────────
export function extractSavings(rec: Record<string, unknown>): number | null {
  const sr = (rec.specialist_recommendation ?? rec) as Record<string, unknown>;

  const inaction =
    typeof sr.cost_of_inaction_usd              === "number" ? sr.cost_of_inaction_usd              :
    typeof sr.estimated_cost_of_inaction_usd     === "number" ? sr.estimated_cost_of_inaction_usd     :
    null;

  const action =
    typeof sr.cost_of_action_usd               === "number" ? sr.cost_of_action_usd               :
    typeof sr.estimated_cost_impact_usd         === "number" ? sr.estimated_cost_impact_usd         :
    0;

  if (typeof inaction !== "number") return null;
  const net = inaction - (action as number);
  return net > 0 ? net : null;
}

// ── Animated count-up ─────────────────────────────────────────────────────────
function CountUp({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start    = performance.now();
    const animate  = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return <>${value.toLocaleString()}</>;
}

// ── SavingsCard ───────────────────────────────────────────────────────────────
export default function SavingsCard({ rec }: { rec: Record<string, unknown> }) {
  const addSavings   = useAgentStore((s) => s.addSavings);
  const totalSavings = useAgentStore((s) => s.totalSavings);
  const runCount     = useAgentStore((s) => s.runCount);

  const sr = (rec.specialist_recommendation ?? {}) as Record<string, unknown>;
  const savings = extractSavings(rec);

  // Register savings once on mount
  const registered = useRef(false);
  useEffect(() => {
    if (!registered.current && savings !== null) {
      addSavings(savings);
      registered.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (savings === null) return null;

  const costAction   = typeof sr.cost_of_action_usd   === "number" ? sr.cost_of_action_usd   :
                       typeof sr.estimated_cost_impact_usd === "number" ? sr.estimated_cost_impact_usd : null;
  const costInaction = typeof sr.cost_of_inaction_usd === "number" ? sr.cost_of_inaction_usd :
                       typeof sr.estimated_cost_of_inaction_usd === "number" ? sr.estimated_cost_of_inaction_usd : null;

  // Cumulative AFTER this run (totalSavings already includes this run)
  const cumulativeAfter = totalSavings;

  return (
    <div
      className="rounded-lg overflow-hidden rec-arrive"
      style={{
        background: "linear-gradient(135deg, rgba(21,128,61,0.08) 0%, rgba(21,128,61,0.04) 100%)",
        border: "1px solid rgba(21,128,61,0.2)",
        borderLeft: "3px solid #15803D",
        padding: "16px 20px",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 9, color: "#15803D" }}>
          Value Protected
        </span>
        <span
          className="font-mono px-2 py-0.5 rounded-sm"
          style={{ fontSize: 9, background: "rgba(21,128,61,0.1)", color: "#15803D", border: "1px solid rgba(21,128,61,0.2)" }}
        >
          Acting now
        </span>
      </div>

      {/* Big savings number */}
      <div className="flex items-baseline gap-2 mb-4">
        <span
          className="font-display tabular"
          style={{ fontSize: 42, fontWeight: 500, color: "#15803D", letterSpacing: "-0.02em", lineHeight: 1 }}
        >
          <CountUp target={savings} duration={1600} />
        </span>
        <span className="font-mono" style={{ fontSize: 11, color: "#15803D", opacity: 0.7 }}>saved</span>
      </div>

      {/* Cost breakdown */}
      <div
        className="flex gap-3 mb-4 p-3 rounded-md"
        style={{ background: "rgba(14,14,16,0.03)", border: "1px solid rgba(14,14,16,0.07)" }}
      >
        {costAction !== null && (
          <div className="flex flex-col flex-1">
            <span className="font-mono uppercase" style={{ fontSize: 8, color: "#76767C", marginBottom: 2 }}>
              Intervention cost
            </span>
            <span className="font-display tabular" style={{ fontSize: 18, color: "#1D4ED8", fontWeight: 500 }}>
              ${Number(costAction).toLocaleString()}
            </span>
          </div>
        )}

        {costAction !== null && costInaction !== null && (
          <div style={{ width: 1, background: "rgba(14,14,16,0.08)", alignSelf: "stretch" }} />
        )}

        {costInaction !== null && (
          <div className="flex flex-col flex-1">
            <span className="font-mono uppercase" style={{ fontSize: 8, color: "#76767C", marginBottom: 2 }}>
              If unaddressed
            </span>
            <span className="font-display tabular" style={{ fontSize: 18, color: "#B91C1C", fontWeight: 500 }}>
              ${Number(costInaction).toLocaleString()}
            </span>
          </div>
        )}

        {costAction !== null && costInaction !== null && (
          <>
            <div style={{ width: 1, background: "rgba(14,14,16,0.08)", alignSelf: "stretch" }} />
            <div className="flex flex-col flex-1">
              <span className="font-mono uppercase" style={{ fontSize: 8, color: "#76767C", marginBottom: 2 }}>
                Net savings
              </span>
              <span className="font-display tabular" style={{ fontSize: 18, color: "#15803D", fontWeight: 600 }}>
                ${savings.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Cumulative footer */}
      {runCount > 0 && cumulativeAfter > savings && (
        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(21,128,61,0.15)" }}>
          <span className="font-mono" style={{ fontSize: 10, color: "#76767C" }}>
            Cumulative across {runCount} analysis run{runCount !== 1 ? "s" : ""}
          </span>
          <span className="font-display tabular font-medium" style={{ fontSize: 16, color: "#15803D" }}>
            ${cumulativeAfter.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
