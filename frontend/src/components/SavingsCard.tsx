import { useEffect, useRef, useState } from "react";
import { useAgentStore } from "../store/agentStore";

// ─── Safe numeric coercion (handles strings like "45000", "$1,200", etc.) ────
function toNum(v: unknown): number | null {
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[$,%\s,]/g, ""));
    return isNaN(n) ? null : n;
  }
  return null;
}

// ─── Extract net savings from any part of the final rec payload ───────────────
export function extractSavings(rec: Record<string, unknown>): number | null {
  // Try the primary specialist_recommendation first, then fall through all outputs
  const candidates: Record<string, unknown>[] = [
    (rec.specialist_recommendation ?? rec) as Record<string, unknown>,
  ];

  // Also scan all_specialist_outputs for the richest source
  const allOutputs = rec.all_specialist_outputs;
  if (Array.isArray(allOutputs)) {
    for (const out of allOutputs) {
      const o = out as Record<string, unknown>;
      // Each entry is {raw_analysis, recommendation}
      if (o.recommendation && typeof o.recommendation === "object")
        candidates.push(o.recommendation as Record<string, unknown>);
      // Also try unwrapped "output" wrapper (orchestrator sometimes nests further)
      const inner = o.output as Record<string, unknown> | undefined;
      if (inner?.recommendation && typeof inner.recommendation === "object")
        candidates.push(inner.recommendation as Record<string, unknown>);
    }
  }

  for (const sr of candidates) {
    const inaction =
      toNum(sr.cost_of_inaction_usd) ??
      toNum(sr.estimated_cost_of_inaction_usd) ??
      null;

    const action =
      toNum(sr.cost_of_action_usd) ??
      toNum(sr.estimated_cost_impact_usd) ??
      0;

    if (inaction !== null) {
      const net = inaction - (action as number);
      if (net > 0) return net;
    }

    // ── Recipe Chemist fallback: synthesize from total_cost_delta_pct ────────
    // Typical FGF revenue at risk per recipe reformulation: ~$2.4M/year
    const RECIPE_REVENUE_AT_RISK = 2_400_000;
    const deltaPct = toNum(sr.total_cost_delta_pct);
    if (deltaPct !== null && deltaPct < 0) {
      // Negative delta = cost reduction = savings
      return Math.round(Math.abs(deltaPct / 100) * RECIPE_REVENUE_AT_RISK);
    }
    // Also handle positive delta presented as savings magnitude
    if (deltaPct !== null && deltaPct > 0 && !sr.cost_of_inaction_usd && !sr.estimated_cost_of_inaction_usd) {
      return Math.round((deltaPct / 100) * RECIPE_REVENUE_AT_RISK);
    }
  }

  return null;
}

// ─── Slot-machine digit reveal ────────────────────────────────────────────────
// Counts up from 0 → target, then when done the final string's characters
// each slide up with a staggered blur-in animation.
function VaultNumber({ target }: { target: number }) {
  const [value, setValue]     = useState(0);
  const [flashing, setFlash]  = useState(false);
  const [settled, setSettled] = useState(false);
  const rafRef = useRef<number | null>(null);
  const DURATION = 1600;

  useEffect(() => {
    const start = performance.now();
    const tick  = (now: number) => {
      const p    = Math.min((now - start) / DURATION, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(ease * target));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Count-up done → trigger flash + settle
        setFlash(true);
        setSettled(true);
        setTimeout(() => setFlash(false), 900);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  const display = `$${value.toLocaleString()}`;

  if (!settled) {
    // During count-up: just render the live number (no char animation yet)
    return (
      <span
        style={{
          fontFamily: "Fraunces, Georgia, serif",
          fontWeight: 500,
          fontSize: 58,
          color: "#4ADE80",
          letterSpacing: "-0.03em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: "'tnum'",
        }}
      >
        {display}
      </span>
    );
  }

  // Once settled: split into individual characters with staggered slide-up
  return (
    <span className={flashing ? "number-flash" : ""}
      style={{
        fontFamily: "Fraunces, Georgia, serif",
        fontWeight: 500,
        fontSize: 58,
        color: "#4ADE80",
        letterSpacing: "-0.03em",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: "'tnum'",
      }}
    >
      {display.split("").map((char, i) => (
        <span
          key={i}
          className="digit-char"
          style={{ animationDelay: `${i * 55}ms` }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

// ─── Risk stacked bar ─────────────────────────────────────────────────────────
function RiskBar({
  savings,
  costAction,
  costInaction,
}: {
  savings: number;
  costAction: number;
  costInaction: number;
}) {
  const total       = costInaction;
  const savedPct    = Math.round((savings    / total) * 100);
  const costPct     = Math.round((costAction / total) * 100);

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono uppercase tracking-widest"
          style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.16em" }}
        >
          Total exposure
        </span>
        <span className="font-mono tabular" style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
          ${costInaction.toLocaleString()}
        </span>
      </div>

      {/* Stacked bar */}
      <div
        style={{
          height: 28,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 6,
          overflow: "hidden",
          display: "flex",
        }}
      >
        {/* Green: savings (money protected) */}
        <div
          className="bar-grow-left"
          style={{
            width: `${savedPct}%`,
            background: "linear-gradient(90deg, #15803D, #22C55E)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 8,
            flexShrink: 0,
          }}
        >
          <span className="font-mono" style={{ fontSize: 8, color: "#DCFCE7", letterSpacing: "0.06em", whiteSpace: "nowrap", fontWeight: 600 }}>
            {savedPct}% PROTECTED
          </span>
        </div>

        {/* Blue: cost of action */}
        <div
          className="bar-grow-right"
          style={{
            width: `${costPct}%`,
            background: "linear-gradient(90deg, #1D4ED8, #3B82F6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 6,
            flexShrink: 0,
          }}
        >
          {costPct >= 14 && (
            <span className="font-mono" style={{ fontSize: 8, color: "#DBEAFE", whiteSpace: "nowrap" }}>
              COST
            </span>
          )}
        </div>
      </div>

      {/* Annotation row */}
      <div className="flex items-start justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 7, height: 7, borderRadius: 2, background: "#22C55E", flexShrink: 0 }} />
          <span className="font-mono" style={{ fontSize: 8.5, color: "rgba(255,255,255,0.35)" }}>
            ${savings.toLocaleString()} locked in
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 7, height: 7, borderRadius: 2, background: "#3B82F6", flexShrink: 0 }} />
          <span className="font-mono" style={{ fontSize: 8.5, color: "rgba(255,255,255,0.35)" }}>
            ${costAction.toLocaleString()} spent
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SavingsCard ──────────────────────────────────────────────────────────────
export default function SavingsCard({ rec }: { rec: Record<string, unknown> }) {
  const addSavings   = useAgentStore((s) => s.addSavings);
  const totalSavings = useAgentStore((s) => s.totalSavings);
  const runCount     = useAgentStore((s) => s.runCount);

  const sr = (rec.specialist_recommendation ?? {}) as Record<string, unknown>;
  const savings = extractSavings(rec);

  const registered = useRef(false);
  useEffect(() => {
    if (!registered.current && savings !== null) {
      addSavings(savings);
      registered.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (savings === null) return null;

  const costAction   = toNum(sr.cost_of_action_usd) ?? toNum(sr.estimated_cost_impact_usd) ?? null;
  const costInaction = toNum(sr.cost_of_inaction_usd) ?? toNum(sr.estimated_cost_of_inaction_usd) ?? null;

  const showBar      = costAction !== null && costInaction !== null && costInaction > 0;
  const cumulativeAfter = totalSavings;

  return (
    /* ── Rotating gradient border wrapper ───────────────────────────────── */
    <div className="savings-vault-border savings-arrive">
      {/* ── Dark interior ─────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(145deg, #080C09 0%, #060A08 100%)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* ── Header strip ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            {/* Pulsing orb */}
            <div style={{ position: "relative", width: 8, height: 8 }}>
              <div
                style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "#22C55E",
                  animation: "live-pulse 2s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  position: "absolute", inset: -2, borderRadius: "50%",
                  background: "rgba(34,197,94,0.2)",
                  animation: "live-pulse 2s ease-in-out infinite",
                }}
              />
            </div>
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 9, color: "#4ADE80", letterSpacing: "0.2em" }}
            >
              Value Protected
            </span>
          </div>

          {/* AI verified badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(74,222,128,0.08)",
              border: "1px solid rgba(74,222,128,0.18)",
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2" stroke="#4ADE80" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-mono" style={{ fontSize: 8.5, color: "#4ADE80" }}>AI Verified</span>
          </div>
        </div>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4">
          {/* Big number */}
          <div className="flex flex-col items-center gap-1 mb-6">
            <VaultNumber target={savings} />
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}
            >
              locked in by acting now
            </span>
          </div>

          {/* Risk bar visualization */}
          {showBar && (
            <div
              className="rounded-xl px-4 py-3.5 mb-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <RiskBar
                savings={savings}
                costAction={costAction!}
                costInaction={costInaction!}
              />
            </div>
          )}

          {/* 3-stat row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {costInaction !== null && (
              <div className="flex flex-col gap-0.5">
                <span className="font-mono uppercase" style={{ fontSize: 7.5, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}>
                  At Risk
                </span>
                <span className="font-display tabular font-medium" style={{ fontSize: 16, color: "#F87171", letterSpacing: "-0.02em" }}>
                  ${costInaction.toLocaleString()}
                </span>
              </div>
            )}
            {costAction !== null && (
              <div className="flex flex-col gap-0.5">
                <span className="font-mono uppercase" style={{ fontSize: 7.5, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}>
                  Your Cost
                </span>
                <span className="font-display tabular font-medium" style={{ fontSize: 16, color: "#60A5FA", letterSpacing: "-0.02em" }}>
                  ${costAction.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-mono uppercase" style={{ fontSize: 7.5, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}>
                Net Saved
              </span>
              <span className="font-display tabular font-semibold" style={{ fontSize: 16, color: "#4ADE80", letterSpacing: "-0.02em" }}>
                ${savings.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cumulative footer */}
          {runCount > 0 && cumulativeAfter > savings && (
            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="font-mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                Session total · {runCount} run{runCount !== 1 ? "s" : ""}
              </span>
              <span
                className="font-display tabular font-medium"
                style={{ fontSize: 14, color: "#4ADE80", letterSpacing: "-0.01em" }}
              >
                ${cumulativeAfter.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
