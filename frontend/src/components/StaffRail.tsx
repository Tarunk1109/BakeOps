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

// ─── Motion variants ──────────────────────────────────────────────────────────
const cardVariants: Variants = {
  idle:   { scale: 1,     opacity: 1, x: 0, transition: { duration: 0.25 } },
  active: { scale: 1.015, opacity: 1, x: 2, transition: { duration: 0.2  } },
  done:   { scale: 1,     opacity: 1, x: 0, transition: { duration: 0.3  } },
};

function AgentCard({ agent, idx }: { agent: AgentMeta; idx: number }) {
  const color    = AGENT_COLORS[agent.id] ?? "#0E0E10";
  const isActive = agent.status === "active";
  const isDone   = agent.status === "done";
  const isIdle   = agent.status === "idle";

  return (
    <motion.div
      variants={cardVariants}
      animate={isActive ? "active" : isDone ? "done" : "idle"}
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.3, ease: "easeOut" }}
      style={{
        borderLeft: `3px solid ${isActive ? color : isDone ? "rgba(21,128,61,0.5)" : "transparent"}`,
        borderBottom: "1px solid var(--border-hairline)",
        background: isActive ? `rgba(${hexToRgb(color)}, 0.04)` : "transparent",
        padding: "16px 24px",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Active sweep shimmer */}
      {isActive && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.3 }}
          style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(90deg, transparent, rgba(${hexToRgb(color)}, 0.06), transparent)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Agent name + status */}
      <div className="flex items-center gap-2 mb-1">
        <motion.div
          animate={{
            backgroundColor: isActive ? color : isDone ? "#15803D" : "#A8A8AE",
            scale: isActive ? [1, 1.3, 1] : 1,
          }}
          transition={isActive
            ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }}
          style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0 }}
        />

        <span
          className="font-sans font-semibold"
          style={{
            fontSize: 14,
            color: isActive
              ? "var(--ink-primary)"
              : isDone
              ? "var(--ink-secondary)"
              : "var(--ink-tertiary)",
            transition: "color 0.2s ease",
          }}
        >
          {agent.name}
        </span>

        {/* Status badge */}
        <motion.div
          className="ml-auto"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isIdle ? 0 : 1, scale: isIdle ? 0.8 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {isActive && (
            <span
              className="font-mono uppercase tracking-wider flex items-center gap-1"
              style={{ fontSize: 8, color }}
            >
              <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: color, animation: "live-pulse 1s ease-in-out infinite" }} />
              Thinking
            </span>
          )}
          {isDone && (
            <span
              className="font-mono uppercase tracking-wider"
              style={{ fontSize: 8, color: "#15803D" }}
            >
              Done ✓
            </span>
          )}
        </motion.div>
      </div>

      {/* Role */}
      <p
        className="font-sans"
        style={{
          fontSize: 12,
          color: "var(--ink-muted)",
          paddingLeft: 14,
          transition: "color 0.2s ease",
        }}
      >
        {agent.role}
      </p>

      {/* Active highlight bar */}
      {isActive && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 3,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, ${color}60, transparent)`,
            transformOrigin: "left",
          }}
        />
      )}
    </motion.div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export default function StaffRail() {
  const agents   = useAgentStore(useShallow((s) => Object.values(s.agents)));
  const isRunning = useAgentStore((s) => s.isRunning);

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
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-hairline)" }}
      >
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 10, color: "var(--ink-tertiary)" }}
        >
          Agents
        </span>
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
            <span className="font-mono uppercase" style={{ fontSize: 8, color: "var(--accent)", letterSpacing: "0.15em" }}>
              Live
            </span>
          </div>
        )}
      </div>

      {/* Agent cards */}
      <div className="flex flex-col">
        {agents.map((agent, idx) => (
          <AgentCard key={agent.id} agent={agent} idx={idx} />
        ))}
      </div>

      {/* Footer — run counter */}
      <div
        className="mt-auto px-6 py-3"
        style={{ borderTop: "1px solid var(--border-hairline)" }}
      >
        <span className="font-mono" style={{ fontSize: 9, color: "var(--ink-muted)" }}>
          FGF North York · Multi-Agent System
        </span>
      </div>
    </aside>
  );
}
