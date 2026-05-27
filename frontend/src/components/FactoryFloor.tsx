import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAgentStore } from "../store/agentStore";
import type { AgentMeta } from "../store/agentStore";

// ─── Isometric projection constants ──────────────────────────────────────────
const CX = 0.55;
const CY = -0.22;

// ─── Lane definitions ─────────────────────────────────────────────────────────
const LANES = [
  { id: "line_1", name: "Naan",      num: "01", baseTp: 4200, target: 4500 },
  { id: "line_2", name: "Croissants",num: "02", baseTp: 1800, target: 2000 },
  { id: "line_3", name: "Muffins",   num: "03", baseTp: 3000, target: 3200 },
  { id: "line_4", name: "Sourdough", num: "04", baseTp: 850,  target: 900  },
];
const LANE_H = 102;

// ─── Equipment definitions ─────────────────────────────────────────────────────
interface EqDef {
  id: string; label: string;
  ax: number; w: number; h: number; d: number;
  isOven?: boolean;
  isSilo?: boolean;
  agentType?: "maintenance" | "supply" | "recipe";
}
const EQ: EqDef[] = [
  { id: "silo",    label: "SLO", ax: 100, w: 24,  h: 52, d: 20, isSilo: true, agentType: "supply" },
  { id: "mixer",   label: "MIX", ax: 182, w: 40,  h: 35, d: 26 },
  { id: "proofer", label: "PRF", ax: 278, w: 50,  h: 42, d: 30 },
  { id: "oven",    label: "OVN", ax: 385, w: 118, h: 30, d: 40, isOven: true, agentType: "maintenance" },
  { id: "cooling", label: "CLG", ax: 563, w: 40,  h: 40, d: 25 },
  { id: "package", label: "PKG", ax: 663, w: 56,  h: 32, d: 32, agentType: "recipe" },
];

const CONVEYORS = [
  { x1: 124, x2: 182 },
  { x1: 222, x2: 278 },
  { x1: 328, x2: 385 },
  { x1: 503, x2: 563 },
  { x1: 603, x2: 663 },
];

// ─── Colors ────────────────────────────────────────────────────────────────────
const C = {
  idle:  { f: "#E2D8C2", t: "#EDE5D0", s: "#C4B89A" },
  oven:  { f: "#C8B488", t: "#D6C49A", s: "#A08C58" },
  alert: { f: "#FECACA", t: "#FEE2E2", s: "#F87171" },
  soft:  { f: "#FDE68A", t: "#FEF3C7", s: "#F59E0B" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const pt = (pts: number[][]) =>
  pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// ─── IsoBox ────────────────────────────────────────────────────────────────────
function IsoBox({
  ax, ay, w, h, d, front, top, side, opacity = 1,
}: {
  ax: number; ay: number; w: number; h: number; d: number;
  front: string; top: string; side: string; opacity?: number;
}) {
  const ff = [[ax,ay],[ax+w,ay],[ax+w,ay-h],[ax,ay-h]];
  const tf = [[ax,ay-h],[ax+w,ay-h],[ax+w+d*CX,ay-h+d*CY],[ax+d*CX,ay-h+d*CY]];
  const sf = [[ax+w,ay],[ax+w+d*CX,ay+d*CY],[ax+w+d*CX,ay-h+d*CY],[ax+w,ay-h]];
  return (
    <g opacity={opacity}>
      <polygon points={pt(tf)} fill={top} />
      <polygon points={pt(ff)} fill={front} />
      <polygon points={pt(sf)} fill={side} />
    </g>
  );
}

// ─── Silo (cylinder-ish: trapezoid front + parallelogram top) ─────────────────
function IsoSilo({
  ax, ay, w, h, d, front, top, side, opacity = 1,
}: {
  ax: number; ay: number; w: number; h: number; d: number;
  front: string; top: string; side: string; opacity?: number;
}) {
  // Body (slightly narrower at top for funnel feel)
  const taper = 4;
  const ff = [[ax+taper/2,ay],[ax+w-taper/2,ay],[ax+w,ay-h],[ax,ay-h]];
  const tf = [[ax,ay-h],[ax+w,ay-h],[ax+w+d*CX,ay-h+d*CY],[ax+d*CX,ay-h+d*CY]];
  const sf = [[ax+w-taper/2,ay],[ax+w+d*CX,ay+d*CY],[ax+w+d*CX,ay-h+d*CY],[ax+w,ay-h]];
  // Cap ellipse approximation (thin rect at top)
  const capH = 5;
  const cap  = [[ax-2,ay-h],[ax+w+2,ay-h],[ax+w+2,ay-h-capH],[ax-2,ay-h-capH]];
  return (
    <g opacity={opacity}>
      <polygon points={pt(tf)} fill={top} />
      <polygon points={pt(ff)} fill={front} />
      <polygon points={pt(sf)} fill={side} />
      <polygon points={pt(cap)} fill={top} opacity="0.7" />
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
const AGENT_PILL: Record<string, string> = {
  maintenance_prophet: "#F59E0B",
  supply_sentinel:     "#60A5FA",
  recipe_chemist:      "#A78BFA",
};

function getPresence(
  agents: AgentMeta[],
  alertInfo: { laneIds: Set<string>; eqIds: Set<string> }
): { agentId: string; laneId: string; eqId: string }[] {
  const res: { agentId: string; laneId: string; eqId: string }[] = [];
  const firstAlertLane = [...alertInfo.laneIds][0] ?? "line_1";

  for (const a of agents) {
    if (a.status !== "active" && a.status !== "done") continue;
    if (a.id === "maintenance_prophet") {
      res.push({ agentId: a.id, laneId: firstAlertLane, eqId: "oven" });
    } else if (a.id === "supply_sentinel") {
      res.push({ agentId: a.id, laneId: firstAlertLane, eqId: "silo" });
    } else if (a.id === "recipe_chemist") {
      const laneId = alertInfo.laneIds.has("line_2") ? "line_2" : firstAlertLane;
      res.push({ agentId: a.id, laneId, eqId: "package" });
    }
  }
  return res;
}

// ─── FactoryFloor ─────────────────────────────────────────────────────────────
export default function FactoryFloor() {
  const scenarioName = useAgentStore((s) => s.scenarioName);
  const isRunning    = useAgentStore((s) => s.isRunning);
  const agents       = useAgentStore(useShallow((s) => Object.values(s.agents)));
  const lineMetrics  = useAgentStore(useShallow((s) => s.lineMetrics));

  const alertInfo = useMemo(() => getAlertInfo(scenarioName), [scenarioName]);
  const presence  = useMemo(() => getPresence(agents, alertInfo), [agents, alertInfo]);

  // Spotlight: when a scenario runs and specific lanes are affected, dim others
  const spotlightActive = isRunning && alertInfo.laneIds.size > 0;

  const GROUND_OFF = 94;
  const SVG_H      = LANE_H * LANES.length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--bg-paper)",
        border: "1px solid var(--border-hairline)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border-hairline)" }}
      >
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 10, color: "var(--ink-tertiary)" }}
        >
          Production Floor · FGF North York
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full pulse-dot"
            style={{ background: "var(--status-running)" }}
          />
          <span className="font-mono uppercase" style={{ fontSize: 9, color: "var(--status-running)" }}>
            Live
          </span>
        </div>
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 900 ${SVG_H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="iso-grid" x="0" y="0" width="24" height="14" patternUnits="userSpaceOnUse">
            <path d="M0,7 L12,0 L24,7 L12,14 Z" fill="none"
              stroke="rgba(14,14,16,0.035)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="oven-heat" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          {/* Spotlight gradient for lane glow */}
          <linearGradient id="alert-lane-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(180,83,9,0)" />
            <stop offset="40%"  stopColor="rgba(180,83,9,0.04)" />
            <stop offset="100%" stopColor="rgba(180,83,9,0)" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="900" height={SVG_H} fill="var(--bg-paper)" />
        <rect width="900" height={SVG_H} fill="url(#iso-grid)" />

        {LANES.map((lane, laneIdx) => {
          const laneY    = laneIdx * LANE_H;
          const groundY  = laneY + GROUND_OFF;
          const isAlert  = alertInfo.laneIds.has(lane.id);
          const tp       = lineMetrics[lane.id]?.throughputPerHour ?? lane.baseTp;
          const tpGood   = tp >= lane.target * 0.95;
          const tpWarn   = tp >= lane.target * 0.85;
          const tpColor  = tpGood ? "#15803D" : tpWarn ? "#B45309" : "#B91C1C";

          return (
            <g key={lane.id}>
              {/* Lane separator */}
              {laneIdx > 0 && (
                <line x1="0" y1={laneY} x2="900" y2={laneY}
                  stroke="rgba(14,14,16,0.07)" strokeWidth="1" />
              )}

              {/* Lane background */}
              {isAlert
                ? <rect x="0" y={laneY} width="900" height={LANE_H} fill="url(#alert-lane-glow)" />
                : spotlightActive
                  ? <rect x="0" y={laneY} width="900" height={LANE_H} fill="rgba(250,250,247,0.62)" />
                  : null
              }

              {/* ── Label column ─────────────────────────────────────── */}
              <rect x="0" y={laneY} width="90" height={LANE_H}
                fill={isAlert ? "rgba(180,83,9,0.03)" : "rgba(14,14,16,0.015)"} />
              <line x1="90" y1={laneY} x2="90" y2={laneY + LANE_H}
                stroke="rgba(14,14,16,0.07)" strokeWidth="1" />

              <text x="8" y={laneY + 16}
                fontFamily="'JetBrains Mono',monospace" fontSize="8"
                fill="#76767C" letterSpacing="0.14em">
                LINE {lane.num}
              </text>
              <text x="8" y={laneY + 31}
                fontFamily="'Fraunces',Georgia,serif" fontSize="14"
                fill="#0E0E10" fontWeight="500">
                {lane.name}
              </text>
              <text x="8" y={laneY + 46}
                fontFamily="'JetBrains Mono',monospace" fontSize="9"
                fill={tpColor}>
                {tp.toLocaleString()}/hr
              </text>

              {/* Status pill */}
              <rect x="6" y={laneY + 53} width={isAlert ? 60 : 74} height="14"
                rx="3"
                fill={isAlert ? "rgba(180,83,9,0.08)" : "rgba(21,128,61,0.08)"}
                stroke={isAlert ? "rgba(180,83,9,0.2)" : "rgba(21,128,61,0.2)"}
                strokeWidth="0.5" />
              <circle cx="13" cy={laneY + 60} r="2.5"
                fill={isAlert ? "#B45309" : "#15803D"} />
              <text x="19" y={laneY + 64}
                fontFamily="'JetBrains Mono',monospace" fontSize="7.5"
                fill={isAlert ? "#B45309" : "#15803D"} letterSpacing="0.1em">
                {isAlert ? "ALERT" : "RUNNING"}
              </text>

              {/* ── Conveyors ────────────────────────────────────────── */}
              {CONVEYORS.map((conv, ci) => {
                const cy  = groundY - 16;
                const len = conv.x2 - conv.x1;
                return (
                  <g key={ci} opacity={spotlightActive && !isAlert ? 0.35 : 1}>
                    <line x1={conv.x1} y1={cy} x2={conv.x2} y2={cy}
                      stroke="rgba(14,14,16,0.10)" strokeWidth="3.5"
                      strokeLinecap="round" />
                    <line x1={conv.x1} y1={cy} x2={conv.x2} y2={cy}
                      stroke="rgba(14,14,16,0.22)" strokeWidth="2"
                      strokeDasharray={`4 ${Math.max(len / 4, 8)}`}
                      strokeLinecap="round"
                      style={{
                        animation: `conveyor-flow ${1.1 + ci * 0.12}s linear infinite`,
                        animationDelay: `${laneIdx * 0.28 + ci * 0.08}s`,
                      }} />
                  </g>
                );
              })}

              {/* ── Equipment ────────────────────────────────────────── */}
              {EQ.map((eq) => {
                const isEqAlert  = isAlert && alertInfo.eqIds.has(eq.id);
                const isEqActive = presence.some(p => p.laneId === lane.id && p.eqId === eq.id);
                const col        = eq.isOven ? C.oven : C.idle;
                const frontC     = isEqAlert ? C.alert.f : isEqActive ? C.soft.f : col.f;
                const topC       = isEqAlert ? C.alert.t : isEqActive ? C.soft.t : col.t;
                const sideC      = isEqAlert ? C.alert.s : isEqActive ? C.soft.s : col.s;
                const eqOpacity  = spotlightActive && !isAlert ? 0.4 : 1;
                const cx         = eq.ax + eq.w / 2;

                return (
                  <g key={eq.id} opacity={eqOpacity}>
                    {/* Ground shadow */}
                    <ellipse
                      cx={eq.ax + eq.w / 2 + eq.d * CX * 0.5}
                      cy={groundY + 3}
                      rx={(eq.w / 2 + eq.d * CX * 0.5) * 0.85}
                      ry={4}
                      fill="rgba(14,14,16,0.07)"
                    />

                    {/* Alert / active glow ring */}
                    {(isEqAlert || isEqActive) && (
                      <rect
                        x={eq.ax - 3} y={groundY - eq.h - 3}
                        width={eq.w + eq.d * CX + 6}
                        height={eq.h + 6} rx="3"
                        fill="none"
                        stroke={isEqAlert ? "#F59E0B" : "#60A5FA"}
                        strokeWidth="1.5" opacity="0.55"
                        strokeDasharray="4 3"
                        className="pulse-dot"
                      />
                    )}

                    {/* Box */}
                    {eq.isSilo ? (
                      <IsoSilo ax={eq.ax} ay={groundY} w={eq.w} h={eq.h} d={eq.d}
                        front={frontC} top={topC} side={sideC} />
                    ) : (
                      <IsoBox ax={eq.ax} ay={groundY} w={eq.w} h={eq.h} d={eq.d}
                        front={frontC} top={topC} side={sideC} />
                    )}

                    {/* Oven interior glow */}
                    {eq.isOven && (
                      <rect
                        x={eq.ax + 5} y={groundY - eq.h + 4}
                        width={eq.w - 10} height={eq.h - 8}
                        fill={isEqAlert ? "rgba(185,28,28,0.28)" : "url(#oven-heat)"}
                        rx="1"
                        style={{
                          animation: `oven-glow ${isEqAlert ? 1.2 : 4}s ease-in-out infinite`,
                        }}
                      />
                    )}

                    {/* Proofer grid lines on front face */}
                    {eq.id === "proofer" && (
                      <g opacity="0.25">
                        {[1, 2, 3].map(i => (
                          <line key={i}
                            x1={eq.ax} y1={groundY - i * (eq.h / 4)}
                            x2={eq.ax + eq.w} y2={groundY - i * (eq.h / 4)}
                            stroke="#8B7355" strokeWidth="0.5"
                          />
                        ))}
                      </g>
                    )}

                    {/* Equipment label */}
                    <text x={cx} y={groundY + 10}
                      fontFamily="'JetBrains Mono',monospace" fontSize="7.5"
                      fill="#76767C" letterSpacing="0.1em" textAnchor="middle">
                      {eq.label}-{lane.num}
                    </text>

                    {/* Presence indicator pill */}
                    {presence
                      .filter(p => p.laneId === lane.id && p.eqId === eq.id)
                      .map(pres => {
                        const pillW  = 30;
                        const pillH  = 15;
                        const pillX  = cx - pillW / 2;
                        const pillY  = groundY - eq.h - 24;
                        const pColor = AGENT_PILL[pres.agentId] ?? "#F59E0B";
                        const isDone = agents.find(a => a.id === pres.agentId)?.status === "done";

                        return (
                          <g key={pres.agentId}
                            style={{ animation: "presence-float 2.2s ease-in-out infinite" }}>
                            {/* Connector */}
                            <line
                              x1={cx} y1={pillY + pillH}
                              x2={cx} y2={groundY - eq.h - 2}
                              stroke={pColor} strokeWidth="1"
                              strokeDasharray="2 2" opacity="0.45"
                            />
                            {/* Pill */}
                            <rect x={pillX} y={pillY}
                              width={pillW} height={pillH} rx="3"
                              fill={isDone ? "#15803D" : pColor} opacity="0.92" />
                            <text x={cx} y={pillY + 10}
                              fontFamily="'JetBrains Mono',monospace" fontSize="7"
                              fill="white" textAnchor="middle" fontWeight="600"
                              letterSpacing="0.05em">
                              {isDone ? "✓" : AGENT_ABBR[pres.agentId]}
                            </text>
                          </g>
                        );
                      })}
                  </g>
                );
              })}

              {/* Alert lane left accent */}
              {isAlert && (
                <rect x="0" y={laneY} width="3" height={LANE_H}
                  fill="#F59E0B" opacity="0.7" />
              )}
            </g>
          );
        })}

        {/* Watermark when idle */}
        {!isRunning && alertInfo.laneIds.size === 0 && (
          <text x="893" y={SVG_H - 8}
            fontFamily="'JetBrains Mono',monospace" fontSize="8.5"
            fill="rgba(14,14,16,0.10)" textAnchor="end" letterSpacing="0.12em">
            ALL SYSTEMS NOMINAL
          </text>
        )}
      </svg>
    </div>
  );
}
