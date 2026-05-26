import { useAgentStore } from "../store/agentStore";

const STATUS_LABEL: Record<string, string> = {
  idle: "IDLE",
  active: "THINKING",
  done: "DONE",
  error: "ERROR",
};

export default function AgentRoster() {
  const agents = useAgentStore((s) => Object.values(s.agents));

  return (
    <aside
      className="flex flex-col border-r overflow-y-auto"
      style={{ width: 240, borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
    >
      <div
        className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        Agent Roster
      </div>

      <div className="flex flex-col gap-px p-2">
        {agents.map((agent, i) => (
          <AgentCard key={agent.id} agent={agent} delay={i * 50} />
        ))}
      </div>
    </aside>
  );
}

function AgentCard({
  agent,
  delay,
}: {
  agent: ReturnType<typeof useAgentStore.getState>["agents"][string];
  delay: number;
}) {
  const isActive = agent.status === "active";
  const isDone = agent.status === "done";

  return (
    <div
      className="rounded-md overflow-hidden fade-up"
      style={{
        animationDelay: `${delay}ms`,
        border: `1px solid ${isActive ? agent.color + "40" : "var(--border-subtle)"}`,
        background: isActive ? agent.color + "08" : "transparent",
        boxShadow: isActive ? `0 0 0 1px ${agent.color}20 inset` : "none",
        transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Color bar */}
      <div className="h-0.5 w-full" style={{ background: agent.color, opacity: isActive ? 1 : isDone ? 0.5 : 0.2 }} />

      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span
            className="font-sans text-[13px] font-medium"
            style={{ color: isActive ? "var(--text-primary)" : isDone ? "var(--text-secondary)" : "var(--text-muted)" }}
          >
            {agent.name}
          </span>
          <StatusPill status={agent.status} color={agent.color} />
        </div>
        <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          {agent.role}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ status, color }: { status: string; color: string }) {
  const isActive = status === "active";
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
      style={{
        background: isActive ? color + "20" : "transparent",
        border: `1px solid ${isActive ? color + "50" : "var(--border-subtle)"}`,
      }}
    >
      {isActive && (
        <span
          className="w-1 h-1 rounded-full pulse-dot"
          style={{ background: color }}
        />
      )}
      <span
        className="font-mono text-[9px] uppercase tracking-wider"
        style={{ color: isActive ? color : "var(--text-muted)" }}
      >
        {STATUS_LABEL[status] ?? status}
      </span>
    </div>
  );
}
