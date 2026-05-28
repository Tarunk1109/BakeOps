import { useAgentStore } from "../store/agentStore";

export default function HeroStatus() {
  const totalOutput = useAgentStore((s) => s.metrics.totalOutput);
  const isRunning   = useAgentStore((s) => s.isRunning);
  const oee         = useAgentStore((s) => s.metrics.oee);

  // Daily production value at risk: output/hr × $3.60/unit × 8hr shift
  const valueAtRisk = Math.round((totalOutput.value * 3.6 * 8) / 1000) * 1000;
  const avg         = totalOutput.history.length
    ? totalOutput.history.reduce((a, b) => a + b, 0) / totalOutput.history.length
    : totalOutput.value;
  const avgValue  = Math.round((avg * 3.6 * 8) / 1000) * 1000;
  const deltaPct  = avgValue > 0 ? ((valueAtRisk - avgValue) / avgValue) * 100 : 0;
  const deltaUp   = deltaPct >= 0;

  const status     = isRunning ? "Monitoring" : "Nominal";
  const statusColor = isRunning ? "var(--accent)" : "var(--status-running)";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-paper)",
        border: "1px solid var(--border-hairline)",
        display: "flex",
      }}
    >
      {/* Left: Production value */}
      <div className="flex-1 p-6">
        <div
          className="font-mono uppercase tracking-[0.18em] mb-3"
          style={{ fontSize: 9.5, color: "var(--ink-tertiary)" }}
        >
          Production Value · Current Shift
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span
            className="font-display font-medium tabular leading-none"
            style={{ fontSize: 52, color: "var(--ink-primary)", letterSpacing: "-0.03em" }}
          >
            ${Math.round(valueAtRisk / 1000)}
          </span>
          <span
            className="font-display"
            style={{ fontSize: 30, color: "var(--ink-tertiary)", letterSpacing: "-0.02em" }}
          >
            K
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 12,
              color: deltaUp ? "var(--status-running)" : "var(--status-danger)",
              fontFamily: "Inter Tight, system-ui, sans-serif",
              fontWeight: 500,
            }}
          >
            {deltaUp ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(1)}%
          </span>
          <span className="font-sans" style={{ fontSize: 12, color: "var(--ink-muted)" }}>
            vs. shift average
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: "var(--border-hairline)", flexShrink: 0 }} />

      {/* Center: OEE */}
      <div className="flex flex-col justify-center px-6 py-6">
        <div className="font-mono uppercase tracking-[0.18em] mb-2" style={{ fontSize: 9.5, color: "var(--ink-tertiary)" }}>
          OEE
        </div>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="font-display font-medium tabular" style={{ fontSize: 36, color: "var(--ink-primary)", letterSpacing: "-0.02em" }}>
            {oee.value.toFixed(1)}
          </span>
          <span className="font-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>%</span>
        </div>
        {/* Mini bar */}
        <div style={{ width: 80, height: 3, background: "var(--border-soft)", borderRadius: 2 }}>
          <div style={{
            width: `${Math.min(oee.value, 100)}%`, height: "100%", borderRadius: 2,
            background: oee.value >= 85 ? "var(--status-running)" : oee.value >= 75 ? "var(--accent)" : "var(--status-danger)",
            transition: "width 0.6s ease",
          }} />
        </div>
        <span className="font-mono mt-1" style={{ fontSize: 9, color: "var(--ink-muted)" }}>target 90%</span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: "var(--border-hairline)", flexShrink: 0 }} />

      {/* Right: Status */}
      <div className="flex flex-col justify-center items-end gap-2 px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full pulse-dot"
            style={{ background: statusColor }}
          />
          <span
            className="font-display font-medium"
            style={{
              fontSize: 26,
              color: statusColor,
              letterSpacing: "-0.01em",
              transition: "color 0.3s ease",
            }}
          >
            {status}
          </span>
        </div>
        <span className="font-sans text-right" style={{ fontSize: 12, color: "var(--ink-tertiary)" }}>
          All 4 lines operational
        </span>
        <span className="font-mono uppercase tracking-wider" style={{ fontSize: 9.5, color: "var(--ink-muted)" }}>
          {Math.round(totalOutput.value).toLocaleString()} units / hr
        </span>
      </div>
    </div>
  );
}
