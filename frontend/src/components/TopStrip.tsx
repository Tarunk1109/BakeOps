import { useEffect, useState } from "react";
import { useAgentStore } from "../store/agentStore";

export default function TopStrip() {
  const [time, setTime]  = useState(() => _fmt(new Date()));
  const totalOutput      = useAgentStore((s) => s.metrics.totalOutput.value);
  const isRunning        = useAgentStore((s) => s.isRunning);
  const scenarioName     = useAgentStore((s) => s.scenarioName);
  const nfcTrigger       = useAgentStore((s) => s.nfcTrigger);
  const runCount         = useAgentStore((s) => s.runCount);
  const totalSavings     = useAgentStore((s) => s.totalSavings);

  useEffect(() => {
    const id = setInterval(() => setTime(_fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const hasAlert = !!nfcTrigger || (isRunning && scenarioName);
  const statusColor = hasAlert ? "var(--accent)" : "var(--status-running)";
  const statusLabel = isRunning ? "Analysing" : nfcTrigger ? "Incident" : "Nominal";

  return (
    <header
      className="flex items-center px-6 shrink-0"
      style={{
        height: 52,
        background: "var(--bg-canvas)",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      {/* Brand */}
      <div className="flex items-baseline gap-2.5">
        <span className="font-display font-medium" style={{ fontSize: 21, color: "var(--ink-primary)", letterSpacing: "-0.01em" }}>
          BakeOps
        </span>
        <span className="font-display italic" style={{ fontSize: 12, color: "var(--ink-tertiary)" }}>
          Command Center
        </span>
      </div>

      {/* Center — plant + run counter */}
      <div className="flex-1 flex items-center justify-center gap-5">
        <span className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 10, color: "var(--ink-tertiary)" }}>
          FGF Brands · North York
        </span>
        <div style={{ width: 1, height: 16, background: "var(--border-hairline)" }} />
        <span className="font-sans" style={{ fontSize: 12, color: "var(--ink-tertiary)" }}>
          {Math.round(totalOutput).toLocaleString()} units / hr
        </span>
        {runCount > 0 && (
          <>
            <div style={{ width: 1, height: 16, background: "var(--border-hairline)" }} />
            <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
              {runCount} run{runCount !== 1 ? "s" : ""}
            </span>
          </>
        )}
        {totalSavings > 0 && (
          <>
            <div style={{ width: 1, height: 16, background: "var(--border-hairline)" }} />
            <div className="flex items-center gap-1.5">
              <span className="font-mono" style={{ fontSize: 10, color: "#15803D" }}>
                💰
              </span>
              <span className="font-display tabular font-medium" style={{ fontSize: 13, color: "#15803D", letterSpacing: "-0.01em" }}>
                ${totalSavings.toLocaleString()}
              </span>
              <span className="font-mono" style={{ fontSize: 9, color: "#76767C" }}>
                saved
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right — status pill + clock */}
      <div className="flex items-center gap-5">
        {/* Active scenario tag */}
        {isRunning && scenarioName && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded"
            style={{
              background: "rgba(180,83,9,0.07)",
              border: "1px solid rgba(180,83,9,0.18)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
            <span className="font-mono uppercase tracking-wider"
              style={{ fontSize: 9, color: "var(--accent)" }}>
              {scenarioName.length > 22 ? scenarioName.slice(0, 22) + "…" : scenarioName}
            </span>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full pulse-dot"
            style={{ background: statusColor }} />
          <span className="font-mono uppercase tracking-wider"
            style={{ fontSize: 11, color: statusColor }}>
            {statusLabel}
          </span>
        </div>

        {/* Clock */}
        <span className="font-mono tabular"
          style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
          {time}
        </span>
      </div>
    </header>
  );
}

function _fmt(d: Date): string {
  return d.toLocaleTimeString("en-CA", { hour12: false, timeZoneName: "short" });
}
