import { AlertTriangle, Thermometer } from "lucide-react";
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

function healthColor(score: number): string {
  if (score >= 0.85) return "var(--status-running)";
  if (score >= 0.70) return "var(--status-warning)";
  return "var(--status-danger)";
}

function Sparkline({ history, color }: { history: number[]; color: string }) {
  if (history.length < 2) return <svg width="100%" height="24" />;
  const w = 160;
  const h = 24;
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
  const gid    = `sg-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gid})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function ProductionLineCard({ line }: { line: Line }) {
  const liveMetrics = useAgentStore((s) => s.lineMetrics[line.id]);
  const liveThroughput = liveMetrics?.throughputPerHour ?? line.throughput_per_hour;
  const history        = liveMetrics?.history ?? [];
  const pct            = Math.round((liveThroughput / line.target_per_hour) * 100);
  const minHealth      = Math.min(...line.equipment.map((e) => e.health_score));
  const hasAnomaly     = line.equipment.some((e) => e.anomaly);
  const lineNum        = line.id.replace("line_", "Line 0");

  const sparkColor = hasAnomaly
    ? "var(--accent)"
    : minHealth < 0.7
    ? "var(--status-danger)"
    : "var(--status-running)";

  return (
    <div
      className="bg-paper rounded-lg flex flex-col overflow-hidden"
      style={{
        border: `1px solid ${hasAnomaly ? "rgba(180,83,9,0.3)" : "var(--border-hairline)"}`,
        boxShadow: hasAnomaly ? "0 0 0 2px rgba(180,83,9,0.06)" : "none",
      }}
    >
      {/* Alert band */}
      {hasAnomaly && (
        <div
          className="h-0.5 w-full"
          style={{ background: "var(--accent)" }}
        />
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div
              className="font-mono uppercase tracking-wider mb-1"
              style={{ fontSize: 10, color: "var(--ink-muted)" }}
            >
              {lineNum}
            </div>
            <div
              className="font-display font-medium leading-tight"
              style={{ fontSize: 18, color: "var(--ink-primary)" }}
            >
              {line.product}
            </div>
          </div>
          {hasAnomaly ? (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded"
              style={{ background: "var(--status-warning-soft)", border: "1px solid rgba(180,83,9,0.2)" }}
            >
              <AlertTriangle size={10} style={{ color: "var(--accent)" }} strokeWidth={2} />
              <span className="font-mono uppercase" style={{ fontSize: 9, color: "var(--accent)" }}>Alert</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--status-running)" }} />
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: "var(--status-running)" }}>
                Running
              </span>
            </div>
          )}
        </div>

        {/* Throughput */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-display tabular leading-none"
              style={{ fontSize: 32, color: "var(--ink-primary)", fontWeight: 500, letterSpacing: "-0.02em" }}
            >
              {liveThroughput.toLocaleString()}
            </span>
            <span
              className="font-mono uppercase tracking-wide"
              style={{ fontSize: 10, color: "var(--ink-tertiary)" }}
            >
              / {line.target_per_hour.toLocaleString()} tgt
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex-1 h-0.5 rounded-full mr-3" style={{ background: "var(--border-soft)" }}>
              <div
                className="h-0.5 rounded-full"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: pct >= 95 ? "var(--status-running)" : pct >= 85 ? "var(--status-warning)" : "var(--status-danger)",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <span
              className="font-mono tabular"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: pct >= 95 ? "var(--status-running)" : pct >= 85 ? "var(--status-warning)" : "var(--status-danger)",
              }}
            >
              {pct}%
            </span>
          </div>
        </div>

        {/* Equipment health mini-list */}
        <div className="flex flex-col gap-1 pt-1" style={{ borderTop: "1px solid var(--border-hairline)" }}>
          {line.equipment.slice(0, 2).map((eq) => (
            <div key={eq.id} className="flex items-center justify-between gap-2">
              <span className="font-mono" style={{ fontSize: 9, color: "var(--ink-muted)", textTransform: "capitalize" }}>
                {eq.type.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-2">
                {eq.current_temp_c && (
                  <div className="flex items-center gap-0.5" style={{ color: "var(--ink-muted)" }}>
                    <Thermometer size={8} strokeWidth={1.5} />
                    <span className="font-mono tabular" style={{ fontSize: 9 }}>{eq.current_temp_c}°</span>
                  </div>
                )}
                <span className="font-mono tabular" style={{ fontSize: 9, color: healthColor(eq.health_score) }}>
                  {Math.round(eq.health_score * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sparkline footer */}
      <div style={{ height: 24, marginTop: "auto" }}>
        <Sparkline history={history} color={sparkColor} />
      </div>
    </div>
  );
}
