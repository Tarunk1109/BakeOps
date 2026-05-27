import { useAgentStore } from "../store/agentStore";

export default function HeroStatus() {
  const totalOutput = useAgentStore((s) => s.metrics.totalOutput);
  const isRunning   = useAgentStore((s) => s.isRunning);

  // Daily production value at risk: output/hr × $3.60/unit × 8hr shift
  const valueAtRisk = Math.round((totalOutput.value * 3.6 * 8) / 1000) * 1000;
  const avg = totalOutput.history.length
    ? totalOutput.history.reduce((a, b) => a + b, 0) / totalOutput.history.length
    : totalOutput.value;
  const avgValue = Math.round((avg * 3.6 * 8) / 1000) * 1000;
  const deltaPct = avgValue > 0 ? ((valueAtRisk - avgValue) / avgValue) * 100 : 0;
  const deltaUp  = deltaPct >= 0;

  const status = isRunning ? "Monitoring" : "Nominal";

  return (
    <div
      className="bg-paper rounded-lg flex items-stretch gap-0 overflow-hidden"
      style={{ border: "1px solid var(--border-hairline)" }}
    >
      {/* Left: Big number */}
      <div className="flex-1 p-8">
        <div
          className="font-mono uppercase tracking-[0.18em] mb-4"
          style={{ fontSize: 11, color: "var(--ink-tertiary)" }}
        >
          Production Value · Current Shift
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span
            className="font-display font-medium tabular leading-none"
            style={{ fontSize: 56, color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            ${Math.round(valueAtRisk / 1000)}
          </span>
          <span
            className="font-display font-medium"
            style={{ fontSize: 32, color: "var(--ink-tertiary)", letterSpacing: "-0.02em" }}
          >
            K
          </span>
        </div>
        <span
          className="font-sans"
          style={{
            fontSize: 13,
            color: deltaUp ? "var(--status-running)" : "var(--status-danger)",
          }}
        >
          {deltaUp ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(1)}% vs. shift average
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, background: "var(--border-hairline)", flexShrink: 0 }} />

      {/* Right: Status */}
      <div className="flex flex-col justify-center items-end gap-2 px-8 py-8">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full pulse-dot"
            style={{ background: isRunning ? "var(--accent)" : "var(--status-running)" }}
          />
          <span
            className="font-display font-medium"
            style={{
              fontSize: 28,
              color: isRunning ? "var(--accent)" : "var(--status-running)",
              letterSpacing: "-0.01em",
            }}
          >
            {status}
          </span>
        </div>
        <span className="font-sans text-right" style={{ fontSize: 13, color: "var(--ink-tertiary)" }}>
          All 4 lines operational
        </span>
        <span
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: 10, color: "var(--ink-muted)" }}
        >
          {Math.round(totalOutput.value).toLocaleString()} units / hr
        </span>
      </div>
    </div>
  );
}
