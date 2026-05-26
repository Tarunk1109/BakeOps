import { useAgentStore } from "../store/agentStore";

const AGENT_META: Record<string, { label: string; color: string; icon: string }> = {
  orchestrator: { label: "Orchestrator", color: "border-violet-500 bg-violet-950/30", icon: "◈" },
  maintenance_prophet: { label: "Maintenance Prophet", color: "border-amber-500 bg-amber-950/30", icon: "⚙" },
};

interface Props {
  agentId: string;
}

const STATUS_DOT: Record<string, string> = {
  idle: "bg-slate-600",
  active: "bg-green-400 animate-pulse",
  done: "bg-blue-400",
  error: "bg-red-400",
};

export default function AgentPanel({ agentId }: Props) {
  const agent = useAgentStore((s) => s.agents[agentId]);
  const meta = AGENT_META[agentId] ?? { label: agentId, color: "border-slate-600 bg-slate-900", icon: "?" };

  if (!agent) return null;

  return (
    <div className={`rounded-lg border ${meta.color} flex flex-col h-full overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <span className="text-lg">{meta.icon}</span>
        <span className="font-semibold text-sm tracking-wide">{meta.label}</span>
        <div className={`ml-auto w-2 h-2 rounded-full ${STATUS_DOT[agent.status]}`} />
        <span className="text-xs text-slate-400 uppercase">{agent.status}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 text-xs font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">
        {agent.thinkingText || (
          <span className="text-slate-600 italic">Waiting for scenario...</span>
        )}
      </div>

      {agent.output && agent.status === "done" && (
        <div className="border-t border-white/10 p-3">
          <div className="text-xs text-slate-400 mb-1 uppercase tracking-widest">Output</div>
          <pre className="text-xs text-green-300 overflow-auto max-h-32">
            {JSON.stringify(agent.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
