import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useAgentStore } from "../store/agentStore";

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  target: number;
  history: number[];
  color: string;
  decimals?: number;
}

function MetricCard({ label, value, unit, target, history, color, decimals = 1 }: MetricCardProps) {
  const delta = value - target;
  const deltaSign = delta >= 0 ? "+" : "";
  const deltaColor = delta >= 0 ? "var(--status-running)" : "var(--status-danger)";
  const data = history.map((v) => ({ v }));

  return (
    <div
      className="flex-1 rounded-md p-3 flex flex-col gap-1 min-w-0"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.16em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span
            className="font-display text-[26px] font-medium tabular leading-none"
            style={{ color: "var(--text-primary)" }}
          >
            {value.toFixed(decimals)}
          </span>
          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
        </div>
        <span className="font-mono text-[10px]" style={{ color: deltaColor }}>
          {deltaSign}{delta.toFixed(1)}
        </span>
      </div>
      <div style={{ height: 28, marginLeft: -4, marginRight: -4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1}
              fill={`url(#grad-${label})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function MetricsBar() {
  const m = useAgentStore((s) => s.metrics);

  return (
    <div className="flex gap-3">
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
