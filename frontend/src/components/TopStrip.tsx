import { useEffect, useRef, useState } from "react";
import { useAgentStore } from "../store/agentStore";

export default function TopStrip() {
  const [time, setTime]  = useState(() => _fmt(new Date()));
  const totalOutput      = useAgentStore((s) => s.metrics.totalOutput.value);
  const isRunning        = useAgentStore((s) => s.isRunning);
  const scenarioName     = useAgentStore((s) => s.scenarioName);
  const nfcTrigger       = useAgentStore((s) => s.nfcTrigger);
  const runCount         = useAgentStore((s) => s.runCount);
  const totalSavings     = useAgentStore((s) => s.totalSavings);
  const prevSavings      = useRef(totalSavings);
  const [savingsFlash, setSavingsFlash] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(_fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  // Flash green when savings increases
  useEffect(() => {
    if (totalSavings > prevSavings.current) {
      setSavingsFlash(true);
      const id = setTimeout(() => setSavingsFlash(false), 900);
      prevSavings.current = totalSavings;
      return () => clearTimeout(id);
    }
    prevSavings.current = totalSavings;
  }, [totalSavings]);

  const statusColor = isRunning ? "var(--accent)" : nfcTrigger ? "var(--status-danger)" : "var(--status-running)";
  const statusLabel = isRunning ? "Analysing" : nfcTrigger ? "Incident" : "Nominal";

  return (
    <header
      className="flex items-center px-5 shrink-0"
      style={{
        height: 48,
        background: "var(--bg-canvas)",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        {/* Logo mark */}
        <div
          style={{
            width: 22, height: 22, borderRadius: 6,
            background: "linear-gradient(135deg, #B45309, #92400E)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: "#FEF3C7", fontWeight: 700, fontFamily: "monospace" }}>B</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-medium" style={{ fontSize: 18, color: "var(--ink-primary)", letterSpacing: "-0.015em" }}>
            BakeOps
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)", letterSpacing: "0.05em" }}>
            v2.0
          </span>
        </div>
      </div>

      {/* Hairline */}
      <div style={{ width: 1, height: 20, background: "var(--border-soft)", margin: "0 16px", flexShrink: 0 }} />

      {/* Center */}
      <div className="flex-1 flex items-center gap-4">
        <span className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 9, color: "var(--ink-tertiary)" }}>
          FGF Brands · North York
        </span>

        <div style={{ width: 1, height: 14, background: "var(--border-hairline)", flexShrink: 0 }} />

        <span className="font-mono tabular" style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>
          {Math.round(totalOutput).toLocaleString()} <span style={{ color: "var(--ink-muted)" }}>units/hr</span>
        </span>

        {runCount > 0 && (
          <>
            <div style={{ width: 1, height: 14, background: "var(--border-hairline)", flexShrink: 0 }} />
            <span className="font-mono" style={{ fontSize: 9, color: "var(--ink-muted)" }}>
              {runCount} analysis run{runCount !== 1 ? "s" : ""}
            </span>
          </>
        )}

        {/* Savings badge — highlight when value exists */}
        {totalSavings > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{
              background: savingsFlash ? "rgba(21,128,61,0.14)" : "rgba(21,128,61,0.07)",
              border: `1px solid ${savingsFlash ? "rgba(21,128,61,0.35)" : "rgba(21,128,61,0.18)"}`,
              transition: "background 0.4s ease, border-color 0.4s ease",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#15803D", animation: "live-pulse 2.5s ease-in-out infinite" }}
            />
            <span
              className="font-display tabular font-medium"
              style={{
                fontSize: 13, letterSpacing: "-0.01em",
                color: savingsFlash ? "#16A34A" : "#15803D",
                transition: "color 0.4s ease",
              }}
            >
              ${totalSavings.toLocaleString()}
            </span>
            <span className="font-mono" style={{ fontSize: 8, color: "#76767C", letterSpacing: "0.08em" }}>
              SAVED
            </span>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Active scenario tag */}
        {isRunning && scenarioName && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{
              background: "rgba(180,83,9,0.06)",
              border: "1px solid rgba(180,83,9,0.16)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
            <span className="font-mono uppercase tracking-wider"
              style={{ fontSize: 9, color: "var(--accent)" }}>
              {scenarioName.length > 24 ? scenarioName.slice(0, 24) + "…" : scenarioName}
            </span>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full pulse-dot"
            style={{ background: statusColor }} />
          <span className="font-mono uppercase tracking-wider"
            style={{ fontSize: 10, color: statusColor }}>
            {statusLabel}
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: "var(--border-hairline)", flexShrink: 0 }} />

        {/* Clock */}
        <span className="font-mono tabular"
          style={{ fontSize: 12, color: "var(--ink-secondary)", letterSpacing: "0.02em" }}>
          {time}
        </span>
      </div>
    </header>
  );
}

function _fmt(d: Date): string {
  return d.toLocaleTimeString("en-CA", { hour12: false, timeZoneName: "short" });
}
