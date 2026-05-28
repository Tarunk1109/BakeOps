import { useAgentStore } from "../store/agentStore";

function Sparkline({ history, color, fill }: { history: number[]; color: string; fill: string }) {
  if (history.length < 2) return <svg width="100%" height="32" />;
  const w = 140, h = 32;
  const min   = Math.min(...history);
  const max   = Math.max(...history);
  const range = max - min || 1;
  const pts   = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - 3 - ((v - min) / range) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const firstX  = pts[0].split(",")[0];
  const lastX   = pts[pts.length - 1].split(",")[0];
  const fillPath = `M ${pts[0]} L ${pts.slice(1).join(" L ")} L ${lastX},${h} L ${firstX},${h} Z`;
  const gid = `mk-${color.replace(/[^a-z0-9]/gi, "")}-${Math.random().toString(36).slice(2,6)}`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={fill} stopOpacity={0.16} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gid})`} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface CardProps {
  label:    string;
  value:    number;
  unit:     string;
  target:   number;
  history:  number[];
  color:    string;
  fill:     string;
  decimals?: number;
  lowerBetter?: boolean;
}

function MetricCard({ label, value, unit, target, history, color, fill, decimals = 1, lowerBetter }: CardProps) {
  const delta   = value - target;
  const isGood  = lowerBetter ? delta <= 0 : delta >= 0;
  const sign    = delta >= 0 ? "+" : "";
  const pct     = Math.min(Math.abs(value / target) * 100, 100);

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-paper)",
        border: "1px solid var(--border-hairline)",
        padding: "16px 16px 0 16px",
      }}
    >
      {/* Label + delta */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 9, color: "var(--ink-muted)" }}>
          {label}
        </span>
        <span
          className="font-mono tabular"
          style={{
            fontSize: 10,
            color: isGood ? "var(--status-running)" : "var(--status-danger)",
            fontWeight: 600,
          }}
        >
          {sign}{delta.toFixed(1)}
        </span>
      </div>

      {/* Main value */}
      <div className="flex items-baseline gap-1 mb-3">
        <span
          className="font-display tabular font-medium leading-none"
          style={{ fontSize: 28, color: "var(--ink-primary)", letterSpacing: "-0.025em" }}
        >
          {value.toFixed(decimals)}
        </span>
        <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
          {unit}
        </span>
      </div>

      {/* Target progress bar */}
      <div className="mb-2" style={{ height: 2, background: "var(--border-hairline)", borderRadius: 1 }}>
        <div
          style={{
            width: `${Math.min(lowerBetter ? 100 - pct + 100 : pct, 100)}%`,
            height: "100%",
            borderRadius: 1,
            background: isGood ? "var(--status-running)" : "var(--status-danger)",
            transition: "width 0.6s ease",
          }}
        />
      </div>

      {/* Sparkline flush to card bottom */}
      <div style={{ height: 32, marginLeft: -16, marginRight: -16, overflow: "hidden" }}>
        <Sparkline history={history} color={color} fill={fill} />
      </div>
    </div>
  );
}

export default function MetricsBar() {
  const m = useAgentStore((s) => s.metrics);

  return (
    <div className="grid grid-cols-4 gap-3">
      <MetricCard
        label="OEE"
        value={m.oee.value}
        unit="%"
        target={90}
        history={m.oee.history}
        color="#15803D"
        fill="#15803D"
        decimals={1}
      />
      <MetricCard
        label="Waste"
        value={m.waste.value}
        unit="%"
        target={2}
        history={m.waste.history}
        color="#B91C1C"
        fill="#B91C1C"
        decimals={1}
        lowerBetter
      />
      <MetricCard
        label="Energy"
        value={m.energy.value}
        unit="kWh"
        target={320}
        history={m.energy.history}
        color="#1D4ED8"
        fill="#1D4ED8"
        decimals={0}
      />
      <MetricCard
        label="Output / hr"
        value={m.totalOutput.value}
        unit="units"
        target={10450}
        history={m.totalOutput.history}
        color="#B45309"
        fill="#B45309"
        decimals={0}
      />
    </div>
  );
}
