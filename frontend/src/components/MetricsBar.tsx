import { useAgentStore } from "../store/agentStore";

function Sparkline({ history, color }: { history: number[]; color: string }) {
  if (history.length < 2) return <svg width="100%" height="28" />;
  const w = 120;
  const h = 28;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return `${x},${y}`;
  });
  const firstX = pts[0].split(",")[0];
  const lastX  = pts[pts.length - 1].split(",")[0];
  const fill   = `M ${pts[0]} L ${pts.slice(1).join(" L ")} L ${lastX},${h} L ${firstX},${h} Z`;
  const gid    = `mk-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.12} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gid})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface CardProps {
  label: string;
  value: number;
  unit: string;
  target: number;
  history: number[];
  color: string;
  decimals?: number;
}

function MetricCard({ label, value, unit, target, history, color, decimals = 1 }: CardProps) {
  const delta     = value - target;
  const deltaSign = delta >= 0 ? "+" : "";
  const isGood    = label === "Waste"
    ? delta <= 0   // lower waste is better
    : delta >= 0;  // higher everything else is better

  return (
    <div
      className="bg-paper rounded-lg p-5 flex flex-col gap-2"
      style={{ border: "1px solid var(--border-hairline)" }}
    >
      <span
        className="font-mono uppercase tracking-[0.18em]"
        style={{ fontSize: 10, color: "var(--ink-tertiary)" }}
      >
        {label}
      </span>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span
            className="font-display tabular leading-none font-medium"
            style={{ fontSize: 28, color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            {value.toFixed(decimals)}
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
            {unit}
          </span>
        </div>
        <span
          className="font-mono tabular"
          style={{
            fontSize: 11,
            color: isGood ? "var(--status-running)" : "var(--status-danger)",
          }}
        >
          {deltaSign}{delta.toFixed(1)}
        </span>
      </div>

      <div style={{ height: 28, marginLeft: -4, marginRight: -4, overflow: "hidden" }}>
        <Sparkline history={history} color={color} />
      </div>
    </div>
  );
}

export default function MetricsBar() {
  const m = useAgentStore((s) => s.metrics);

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="OEE"
        value={m.oee.value}
        unit="%"
        target={90}
        history={m.oee.history}
        color="var(--status-running)"
        decimals={1}
      />
      <MetricCard
        label="Waste"
        value={m.waste.value}
        unit="%"
        target={2}
        history={m.waste.history}
        color="var(--status-danger)"
        decimals={1}
      />
      <MetricCard
        label="Energy"
        value={m.energy.value}
        unit="kWh"
        target={320}
        history={m.energy.history}
        color="var(--status-info)"
        decimals={0}
      />
      <MetricCard
        label="Output / hr"
        value={m.totalOutput.value}
        unit="units"
        target={10450}
        history={m.totalOutput.history}
        color="var(--accent)"
        decimals={0}
      />
    </div>
  );
}
