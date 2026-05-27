import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAgentStore } from "../store/agentStore";
import type { AgentMeta } from "../store/agentStore";

// ─── Isometric projection constants ──────────────────────────────────────────
const CX = 0.55;   // depth → screen-x
const CY = -0.22;  // depth → screen-y (negative = up in SVG)

// ─── Lane definitions ─────────────────────────────────────────────────────────
const LANES = [
  { id: "line_1", name: "Naan",          num: "01", baseTp: 4200, target: 4500 },
  { id: "line_2", name: "Croissants",    num: "02", baseTp: 1800, target: 2000 },
  { id: "line_3", name: "Muffins",       num: "03", baseTp: 3000, target: 3200 },
  { id: "line_4", name: "Sourdough",     num: "04", baseTp: 850,  target: 900  },
];

// ─── Equipment definitions (shared across all lanes) ──────────────────────────
interface EqDef {
  id: string; label: string;
  ax: number; w: number; h: number; d: number;
  isOven?: boolean;
  agentType?: "maintenance" | "supply" | "recipe";
}
const EQ: EqDef[] = [
  { id: "silo",    label: "SLO", ax: 100, w: 24,  h: 52, d: 20, agentType: "supply" },
  { id: "mixer",   label: "MIX", ax: 180, w: 40,  h: 35, d: 26 },
  { id: "proofer", label: "PRF", ax: 277, w: 50,  h: 42, d: 30 },
  { id: "oven",    label: "OVN", ax: 383, w: 118, h: 30, d: 40, isOven: true, agentType: "maintenance" },
  { id: "cooling", label: "CLG", ax: 562, w: 40,  h: 40, d: 25 },
  { id: "package", label: "PKG", ax: 662, w: 56,  h: 32, d: 32, agentType: "recipe" },
];

// Conveyor segments (x range between equipment pieces)
const CONVEYORS = [
  { x1: 124, x2: 180 },
  { x1: 220, x2: 277 },
  { x1: 327, x2: 383 },
  { x1: 501, x2: 562 },
  { x1: 602, x2: 662 },
];

// ─── Colors ────────────────────────────────────────────────────────────────────
const COLORS = {
  idle:  { f: "#E2D8C2", t: "#EDE5D2", s: "#C4B89A" },
  oven:  { f: "#C8B488", t: "#D8C89C", s: "#A69060" },
  alert: { f: "#FECACA", t: "#FEE2E2", s: "#F87171" },
  soft:  { f: "#FDE68A", t: "#FEF3C7", s: "#F59E0B" }, // agent investigating
};

// ─── Point string helper ──────────────────────────────────────────────────────
const pt = (pts: number[][]) =>
  pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// ─── IsoBox component ─────────────────────────────────────────────────────────
function IsoBox({
  ax, ay, w, h, d,
  front, top, side,
  opacity = 1,
}: {
  ax: number; ay: number; w: number; h: number; d: number;
  front: string; top: string; side: string; opacity?: number;
}) {
  const ff = [[ax,ay],[ax+w,ay],[ax+w,ay-h],[ax,ay-h]];
  const tf = [[ax,ay-h],[ax+w,ay-h],[ax+w+d*CX,ay-h+d*CY],[ax+d*CX,ay-h+d*CY]];
  const sf = [[ax+w,ay],[ax+w+d*CX,ay+d*CY],[ax+w+d*CX,ay-h+d*CY],[ax+w,ay-h]];
  return (
    <g opacity={opacity}>
      <polygon points={pt(tf)} fill={top}   stroke="none" />
      <polygon points={pt(ff)} fill={front} stroke="none" />
      <polygon points={pt(sf)} fill={side}  stroke="none" />
    </g>
  );
}

// ─── Alert detection ──────────────────────────────────────────────────────────
function getAlertInfo(scenarioName: string): { laneIds: Set<string>; eqIds: Set<string> } {
  const s = scenarioName.toLowerCase();
  const laneIds = new Set<string>();
  const eqIds   = new Set<string>();

  if (/scn-1|tunnel.*oven|oven.*anomaly|heating.*element|maintenance/i.test(s)) {
    laneIds.add("line_1"); eqIds.add("oven");
  }
  if (/scn-2|yeast|lallemand|supply|shortage|allocation/i.test(s)) {
    LANES.forEach(l => laneIds.add(l.id)); eqIds.add("silo");
  }
  if (/scn-3|clean.*label|costco|croissant|reformul|calcium|propionate/i.test(s)) {
    laneIds.add("line_2"); eqIds.add("package");
  }
  if (/scn-4|mold|recall|stonefire|shelf.*life/i.test(s)) {
    laneIds.add("line_1"); eqIds.add("oven"); eqIds.add("package");
  }
  return { laneIds, eqIds };
}

// ─── Presence indicators ──────────────────────────────────────────────────────
const AGENT_ABBR: Record<string, string>  = {
  maintenance_prophet: "MNT",
  supply_sentinel:     "SUP",
  recipe_chemist:      "RCP",
};
const AGENT_PILL_COLOR: Record<string, string> = {
  maintenance_prophet: "#F59E0B",
  supply_sentinel:     "#60A5FA",
  recipe_chemist:      "#A78BFA",
};

function getPresence(
  agents: AgentMeta[],
  alertInfo: { laneIds: Set<string>; eqIds: Set<string> }
): { agentId: string; laneId: string; eqId: string }[] {
  const results: { agentId: string; laneId: string; eqId: string }[] = [];
  const firstAlertLane = [...alertInfo.laneIds][0] ?? "line_1";

  for (const a of agents) {
    if (a.status !== "active" && a.status !== "done") continue;
    if (a.id === "maintenance_prophet") {
      results.push({ agentId: a.id, laneId: firstAlertLane, eqId: "oven" });
    } else if (a.id === "supply_sentinel") {
      results.push({ agentId: a.id, laneId: firstAlertLane, eqId: "silo" });
    } else if (a.id === "recipe_chemist") {
      const laneId = alertInfo.laneIds.has("line_2") ? "line_2" : firstAlertLane;
      results.push({ agentId: a.id, laneId, eqId: "package" });
    }
  }
  return results;
}

// ─── FactoryFloor ─────────────────────────────────────────────────────────────
export default function FactoryFloor() {
  const scenarioName = useAgentStore((s) => s.scenarioName);
  const isRunning    = useAgentStore((s) => s.isRunning);
  const agents       = useAgentStore(useShallow((s) => Object.values(s.agents)));
  const lineMetrics  = useAgentStore(useShallow((s) => s.lineMetrics));

  const alertInfo = useMemo(() => getAlertInfo(scenarioName), [scenarioName]);
  const presence  = useMemo(() => getPresence(agents, alertInfo), [agents, alertInfo]);

  const LANE_H     = 100;
  const GROUND_OFF = 93; // distance from top of lane to ground line

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--bg-paper)",
        border: "1px solid var(--border-hairline)",
      }}
    >
      {/* Section header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border-hairline)" }}
      >
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 10, color: "var(--ink-tertiary)" }}
        >
          Production Floor
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--status-running)" }} />
          <span className="font-mono uppercase" style={{ fontSize: 9, color: "var(--status-running)" }}>
            Live
          </span>
        </div>
      </div>

      {/* SVG Factory Floor */}
      <svg
        viewBox="0 0 900 410"
        style={{ width: "100%", height: "auto", display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Subtle background grid */}
          <pattern id="iso-grid" x="0" y="0" width="24" height="14" patternUnits="userSpaceOnUse">
            <path d="M0,7 L12,0 L24,7 L12,14 Z" fill="none" stroke="rgba(14,14,16,0.04)" strokeWidth="0.5" />
          </pattern>
          {/* Oven interior gradient */}
          <radialGradient id="oven-heat" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="900" height="410" fill="var(--bg-paper)" />
        <rect width="900" height="410" fill="url(#iso-grid)" />

        {LANES.map((lane, laneIdx) => {
          const laneY     = laneIdx * LANE_H;
          const groundY   = laneY + GROUND_OFF;
          const isAlert   = alertInfo.laneIds.has(lane.id);
          const throughput = lineMetrics[lane.id]?.throughputPerHour ?? lane.baseTp;

          // Lane separator
          return (
            <g key={lane.id}>
              {/* Lane background tint (alert state) */}
              {isAlert && (
                <rect
                  x="0" y={laneY} width="900" height={LANE_H}
                  fill="rgba(245,158,11,0.03)"
                />
              )}

              {/* Lane separator */}
              {laneIdx > 0 && (
                <line x1="0" y1={laneY} x2="900" y2={laneY}
                  stroke="rgba(14,14,16,0.06)" strokeWidth="1" />
              )}

              {/* ── Lane label ─────────────────────────────────────────── */}
              <g>
                {/* Label background */}
                <rect
                  x="0" y={laneY} width="88" height={LANE_H}
                  fill={isAlert ? "rgba(245,158,11,0.04)" : "rgba(14,14,16,0.015)"}
                />
                <line x1="88" y1={laneY} x2="88" y2={laneY + LANE_H}
                  stroke="rgba(14,14,16,0.06)" strokeWidth="1" />

                {/* Line ID */}
                <text
                  x="8" y={laneY + 17}
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize="8"
                  fill="#76767C"
                  letterSpacing="0.15em"
                  textAnchor="start"
                >
                  LINE {lane.num}
                </text>

                {/* Product name */}
                <text
                  x="8" y={laneY + 32}
                  fontFamily="'Fraunces', Georgia, serif"
                  fontSize="13"
                  fill="#0E0E10"
                  fontWeight="500"
                  textAnchor="start"
                >
                  {lane.name}
                </text>

                {/* Throughput */}
                <text
                  x="8" y={laneY + 46}
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize="9"
                  fill={throughput >= lane.target * 0.95 ? "#15803D" : throughput >= lane.target * 0.85 ? "#B45309" : "#B91C1C"}
                  textAnchor="start"
                >
                  {throughput.toLocaleString()}/hr
                </text>

                {/* Status pill */}
                <rect
                  x="6" y={laneY + 54}
                  width="68" height="14"
                  rx="3"
                  fill={isAlert ? "rgba(180,83,9,0.08)" : "rgba(21,128,61,0.08)"}
                  stroke={isAlert ? "rgba(180,83,9,0.2)" : "rgba(21,128,61,0.2)"}
                  strokeWidth="0.5"
                />
                <circle
                  cx="13" cy={laneY + 61}
                  r="3"
                  fill={isAlert ? "#B45309" : "#15803D"}
                  className={isAlert ? "pulse-dot" : ""}
                />
                <text
                  x="19" y={laneY + 65}
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize="8"
                  fill={isAlert ? "#B45309" : "#15803D"}
                  letterSpacing="0.12em"
                >
                  {isAlert ? "ALERT" : "RUNNING"}
                </text>
              </g>

              {/* ── Conveyors ─────────────────────────────────────────── */}
              {CONVEYORS.map((conv, ci) => {
                const cy = groundY - 16;
                const len = conv.x2 - conv.x1;
                return (
                  <g key={`conv-${ci}`}>
                    {/* Conveyor track */}
                    <line
                      x1={conv.x1} y1={cy}
                      x2={conv.x2} y2={cy}
                      stroke="rgba(14,14,16,0.12)" strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Animated flow dots */}
                    <line
                      x1={conv.x1} y1={cy}
                      x2={conv.x2} y2={cy}
                      stroke="rgba(14,14,16,0.25)" strokeWidth="2"
                      strokeDasharray={`4 ${len / 3}`}
                      strokeLinecap="round"
                      style={{
                        animation: `conveyor-flow ${1.2 + ci * 0.15}s linear infinite`,
                        animationDelay: `${laneIdx * 0.3 + ci * 0.1}s`,
                      }}
                    />
                  </g>
                );
              })}

              {/* ── Equipment pieces ──────────────────────────────────── */}
              {EQ.map((eq) => {
                const isEqAlert  = isAlert && alertInfo.eqIds.has(eq.id);
                const isEqActive = presence.some(p => p.laneId === lane.id && p.eqId === eq.id);
                const col = isEqAlert ? COLORS.alert : eq.isOven ? COLORS.oven : COLORS.idle;

                // Center x for labels/glow
                const cx = eq.ax + eq.w / 2;
                const topY = groundY - eq.h;

                return (
                  <g key={eq.id}>
                    {/* Active glow ring (agent investigating) */}
                    {isEqActive && (
                      <rect
                        x={eq.ax - 3}
                        y={groundY - eq.h - 3}
                        width={eq.w + eq.d * CX + 6}
                        height={eq.h + 6}
                        rx="3"
                        fill="none"
                        stroke={isEqAlert ? "#F59E0B" : "#60A5FA"}
                        strokeWidth="1.5"
                        opacity="0.6"
                        strokeDasharray="4 3"
                        className="pulse-dot"
                      />
                    )}

                    <IsoBox
                      ax={eq.ax} ay={groundY}
                      w={eq.w} h={eq.h} d={eq.d}
                      front={isEqAlert ? COLORS.alert.f : isEqActive ? COLORS.soft.f : col.f}
                      top={isEqAlert ? COLORS.alert.t : isEqActive ? COLORS.soft.t : col.t}
                      side={isEqAlert ? COLORS.alert.s : isEqActive ? COLORS.soft.s : col.s}
                    />

                    {/* Oven interior glow */}
                    {eq.isOven && !isEqAlert && (
                      <rect
                        x={eq.ax + 4}
                        y={groundY - eq.h + 4}
                        width={eq.w - 8}
                        height={eq.h - 8}
                        fill="url(#oven-heat)"
                        className="oven-glow"
                        rx="1"
                      />
                    )}

                    {/* Alert oven glow (faster pulse) */}
                    {eq.isOven && isEqAlert && (
                      <rect
                        x={eq.ax + 4}
                        y={groundY - eq.h + 4}
                        width={eq.w - 8}
                        height={eq.h - 8}
                        fill="rgba(185,28,28,0.3)"
                        rx="1"
                        style={{ animation: "oven-glow 1.5s ease-in-out infinite" }}
                      />
                    )}

                    {/* Equipment label */}
                    <text
                      x={cx}
                      y={groundY + 9}
                      fontFamily="'JetBrains Mono', monospace"
                      fontSize="7.5"
                      fill="#76767C"
                      letterSpacing="0.1em"
                      textAnchor="middle"
                    >
                      {eq.label}-{lane.num}
                    </text>

                    {/* ── Presence indicator ──────────────────────────── */}
                    {presence
                      .filter(p => p.laneId === lane.id && p.eqId === eq.id)
                      .map((pres) => {
                        const pillW  = 28;
                        const pillH  = 14;
                        const pillX  = cx - pillW / 2;
                        const pillY  = topY - 22;
                        const pColor = AGENT_PILL_COLOR[pres.agentId] ?? "#F59E0B";
                        const isDone = agents.find(a => a.id === pres.agentId)?.status === "done";

                        return (
                          <g
                            key={pres.agentId}
                            style={{ animation: "presence-float 2.2s ease-in-out infinite" }}
                          >
                            {/* Dashed connector line */}
                            <line
                              x1={cx} y1={pillY + pillH}
                              x2={cx} y2={topY - 2}
                              stroke={pColor} strokeWidth="1"
                              strokeDasharray="2 2" opacity="0.5"
                            />
                            {/* Pill */}
                            <rect
                              x={pillX} y={pillY}
                              width={pillW} height={pillH}
                              rx="3"
                              fill={isDone ? "#15803D" : pColor}
                              opacity="0.9"
                            />
                            <text
                              x={cx}
                              y={pillY + 9}
                              fontFamily="'JetBrains Mono', monospace"
                              fontSize="7"
                              fill="white"
                              textAnchor="middle"
                              fontWeight="600"
                              letterSpacing="0.05em"
                            >
                              {isDone ? "✓" : AGENT_ABBR[pres.agentId]}
                            </text>
                          </g>
                        );
                      })}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Idle watermark */}
        {!isRunning && alertInfo.laneIds.size === 0 && (
          <text
            x="820" y="395"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="9"
            fill="rgba(14,14,16,0.12)"
            textAnchor="end"
            letterSpacing="0.12em"
          >
            ALL SYSTEMS NOMINAL
          </text>
        )}
      </svg>
    </div>
  );
}
