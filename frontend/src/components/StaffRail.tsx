import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { useShallow } from "zustand/react/shallow";
import { useAgentStore } from "../store/agentStore";
import type { AgentMeta } from "../store/agentStore";

const AGENT_COLORS: Record<string, string> = {
  orchestrator:        "#0E0E10",
  maintenance_prophet: "#B45309",
  supply_sentinel:     "#1D4ED8",
  recipe_chemist:      "#6D28D9",
};

const AGENT_ABBR: Record<string, string> = {
  orchestrator:        "ORC",
  maintenance_prophet: "MNT",
  supply_sentinel:     "SUP",
  recipe_chemist:      "RCP",
};

const AGENT_BG: Record<string, string> = {
  orchestrator:        "rgba(14,14,16,0.06)",
  maintenance_prophet: "rgba(180,83,9,0.06)",
  supply_sentinel:     "rgba(29,78,216,0.06)",
  recipe_chemist:      "rgba(109,40,217,0.06)",
};

// ── Motion variants ────────────────────────────────────────────────────────────
const cardVariants: Variants = {
  idle:   { scale: 1,     opacity: 0.75, x: 0, transition: { duration: 0.25 } },
  active: { scale: 1.01,  opacity: 1,    x: 3, transition: { duration: 0.2  } },
  done:   { scale: 1,     opacity: 1,    x: 0, transition: { duration: 0.3  } },
};

function AgentCard({ agent, idx }: { agent: AgentMeta; idx: number }) {
  const color    = AGENT_COLORS[agent.id] ?? "#0E0E10";
  const bg       = AGENT_BG[agent.id]    ?? "rgba(14,14,16,0.04)";
  const abbr     = AGENT_ABBR[agent.id]  ?? "AGT";
  const isActive = agent.status === "active";
  const isDone   = agent.status === "done";
  const isIdle   = agent.status === "idle";

  return (
    <motion.div
      variants={cardVariants}
      animate={isActive ? "active" : isDone ? "done" : "idle"}
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: isIdle ? 0.75 : 1, x: 0 }}
      transition={{ delay: idx * 0.06, duration: 0.28, ease: "easeOut" }}
      style={{
        borderLeft: `3px solid ${isActive ? color : isDone ? "#15803D" : "transparent"}`,
        borderBottom: "1px solid var(--border-hairline)",
        background: isActive ? bg : "transparent",
        padding: "14px 20px",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.3s ease",
      }}
    >
      {/* Active shimmer */}
      {isActive && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: 0.2 }}
          style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(90deg, transparent, ${color}08, transparent)`,
            pointerEvents: "none",
          }}
        />
      )}

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isActive ? color : isDone ? "#F0FDF4" : "var(--border-soft)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.3s ease",
            border: isDone ? "1px solid rgba(21,128,61,0.3)" : "none",
          }}
        >
          <span
            className="font-mono font-semibold"
            style={{
              fontSize: 8.5,
              color: isActive ? "#FFFFFF" : isDone ? "#15803D" : "var(--ink-muted)",
              letterSpacing: "0.06em",
            }}
          >
            {isDone ? "✓" : abbr}
          </span>
        </div>

        {/* Name + role */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="font-sans font-semibold"
            style={{
              fontSize: 13,
              color: isActive ? "var(--ink-primary)" : isDone ? "var(--ink-secondary)" : "var(--ink-muted)",
              letterSpacing: "-0.01em",
              transition: "color 0.25s ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {agent.name}
          </span>
          <p className="font-sans" style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.4 }}>
            {agent.role}
          </p>
        </div>

        {/* Status badge */}
        <motion.div
          className="ml-auto shrink-0"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: isIdle ? 0 : 1, scale: isIdle ? 0.7 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {isActive && (
            <div className="flex items-center gap-1">
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: color,
                }}
              />
              <span className="font-mono uppercase" style={{ fontSize: 8, color, letterSpacing: "0.1em" }}>
                Live
              </span>
            </div>
          )}
          {isDone && (
            <span className="font-mono uppercase" style={{ fontSize: 8, color: "#15803D", letterSpacing: "0.1em" }}>
              Done ✓
            </span>
          )}
        </motion.div>
      </div>

      {/* Active highlight line at bottom */}
      {isActive && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "absolute", bottom: 0, left: 3, right: 0, height: 1,
            background: `linear-gradient(90deg, ${color}50, transparent)`,
            transformOrigin: "left",
          }}
        />
      )}
    </motion.div>
  );
}

export default function StaffRail() {
  const agents    = useAgentStore(useShallow((s) => Object.values(s.agents)));
  const isRunning = useAgentStore((s) => s.isRunning);
  const runCount  = useAgentStore((s) => s.runCount);

  const activeCount = agents.filter((a) => a.status === "active").length;
  const doneCount   = agents.filter((a) => a.status === "done").length;

  return (
    <aside
      className="flex flex-col overflow-y-auto"
      style={{
        flex: 1,
        minHeight: 0,
        background: "var(--bg-canvas)",
        borderRight: "1px solid var(--border-hairline)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-hairline)" }}
      >
        <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 9.5, color: "var(--ink-tertiary)" }}>
          Agents
        </span>
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 8, color: "var(--accent)" }}>
              {activeCount > 0 ? `${activeCount} live` : "routing"}
            </span>
          </div>
        )}
        {!isRunning && doneCount > 0 && (
          <span className="font-mono" style={{ fontSize: 8.5, color: "var(--status-running)" }}>
            {doneCount} done
          </span>
        )}
      </div>

      {/* Agent cards */}
      <div className="flex flex-col">
        {agents.map((agent, idx) => (
          <AgentCard key={agent.id} agent={agent} idx={idx} />
        ))}
      </div>

      {/* Footer */}
      <div
        className="mt-auto px-5 py-3 flex flex-col gap-1"
        style={{ borderTop: "1px solid var(--border-hairline)" }}
      >
        <span className="font-mono" style={{ fontSize: 8.5, color: "var(--ink-muted)" }}>
          FGF North York · AI Command Center
        </span>
        {runCount > 0 && (
          <span className="font-mono" style={{ fontSize: 8.5, color: "var(--ink-muted)", opacity: 0.6 }}>
            {runCount} scenario{runCount !== 1 ? "s" : ""} analysed this session
          </span>
        )}
      </div>
    </aside>
  );
}
