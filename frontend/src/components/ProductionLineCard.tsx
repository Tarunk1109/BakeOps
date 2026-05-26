import { useState } from "react";
import { AlertTriangle, Thermometer, Activity } from "lucide-react";
import { useAgentStore } from "../store/agentStore";

interface Equipment {
  id: string;
  type: string;
  health_score: number;
  current_temp_c?: number;
  target_temp_c?: number;
  anomaly?: string;
}

interface Line {
  id: string;
  product: string;
  status: string;
  throughput_per_hour: number;
  target_per_hour: number;
  equipment: Equipment[];
}

interface Props {
  line: Line;
}

function healthColor(score: number): string {
  if (score >= 0.85) return "var(--status-running)";
  if (score >= 0.70) return "var(--status-warning)";
  return "var(--status-danger)";
}

export default function ProductionLineCard({ line }: Props) {
  const [hovered, setHovered] = useState(false);
  const liveMetrics = useAgentStore((s) => s.lineMetrics[line.id]);

  const liveThroughput = liveMetrics?.throughputPerHour ?? line.throughput_per_hour;
  const pct = Math.round((liveThroughput / line.target_per_hour) * 100);
  const minHealth = Math.min(...line.equipment.map((e) => e.health_score));
  const hasAnomaly = line.equipment.some((e) => e.anomaly);
  const lineNum = line.id.replace("line_", "LINE-0");
  const borderColor = hasAnomaly ? "var(--status-danger)" : minHealth < 0.7 ? "var(--status-warning)" : "var(--border-default)";

  return (
    <div
      className="rounded-md flex flex-col cursor-default"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${borderColor}`,
        boxShadow: hasAnomaly ? "0 0 12px rgba(239,68,68,0.08)" : "none",
        transition: "border-color 0.3s",
        minHeight: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card header */}
      <div className="flex items-start justify-between p-3 pb-2">
        <div>
          <div
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {lineNum}
          </div>
          <div
            className="font-display text-[17px] font-medium mt-0.5 leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {line.product}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {hasAnomaly && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <AlertTriangle size={10} strokeWidth={1.5} style={{ color: "var(--status-danger)" }} />
              <span className="font-mono text-[9px] uppercase" style={{ color: "var(--status-danger)" }}>Alert</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full pulse-dot"
              style={{ background: "var(--status-running)" }}
            />
            <span className="font-mono text-[10px] uppercase" style={{ color: "var(--status-running)" }}>
              Running
            </span>
          </div>
        </div>
      </div>

      {/* Throughput */}
      <div className="px-3 pb-2 flex items-baseline gap-1.5">
        <span
          className="font-mono text-[22px] font-medium tabular"
          style={{ color: "var(--text-primary)" }}
        >
          {liveThroughput.toLocaleString()}
        </span>
        <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          / {line.target_per_hour.toLocaleString()} tgt
        </span>
        <span
          className="ml-auto font-mono text-[12px] font-medium"
          style={{ color: pct >= 95 ? "var(--status-running)" : pct >= 85 ? "var(--status-warning)" : "var(--status-danger)" }}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-3 pb-2">
        <div className="h-0.5 rounded-full" style={{ background: "var(--border-default)" }}>
          <div
            className="h-0.5 rounded-full"
            style={{
              width: `${Math.min(pct, 100)}%`,
              background: pct >= 95 ? "var(--status-running)" : pct >= 85 ? "var(--status-warning)" : "var(--status-danger)",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      {/* Equipment — shown on hover or if anomaly */}
      <div
        className="overflow-hidden transition-all"
        style={{ maxHeight: hovered || hasAnomaly ? 200 : 0, transition: "max-height 0.25s ease" }}
      >
        <div className="px-3 pb-3 flex flex-col gap-1 border-t" style={{ borderColor: "var(--border-subtle)", paddingTop: 8, marginTop: 4 }}>
          {line.equipment.map((eq) => (
            <div key={eq.id} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {eq.type.replace(/_/g, " ")}
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: healthColor(eq.health_score) }}
                  >
                    {Math.round(eq.health_score * 100)}%
                  </span>
                </div>
                <div className="h-px mt-0.5 rounded" style={{ background: "var(--border-subtle)" }}>
                  <div
                    className="h-px rounded"
                    style={{ width: `${eq.health_score * 100}%`, background: healthColor(eq.health_score) }}
                  />
                </div>
              </div>
              {eq.current_temp_c && (
                <div className="flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                  <Thermometer size={9} strokeWidth={1.5} />
                  <span className="font-mono text-[10px] tabular">{eq.current_temp_c}°</span>
                </div>
              )}
              {eq.anomaly && (
                <AlertTriangle size={10} strokeWidth={1.5} style={{ color: "var(--status-danger)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* OEE mini indicator */}
      <div
        className="mt-auto px-3 py-2 flex items-center gap-1 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Activity size={10} strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
        <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          Health · <span style={{ color: healthColor(minHealth) }}>{Math.round(minHealth * 100)}%</span>
        </span>
      </div>
    </div>
  );
}
