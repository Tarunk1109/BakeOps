import { useRef, useEffect } from "react";
import { Wrench, ShieldAlert, FlaskConical, Network, ArrowRight, Zap } from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import type { StreamEntry } from "../store/agentStore";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  orchestrator: <Network size={11} strokeWidth={1.5} />,
  maintenance_prophet: <Wrench size={11} strokeWidth={1.5} />,
  supply_sentinel: <ShieldAlert size={11} strokeWidth={1.5} />,
  recipe_chemist: <FlaskConical size={11} strokeWidth={1.5} />,
};

const AGENT_COLORS: Record<string, string> = {
  orchestrator: "#FAFAFA",
  maintenance_prophet: "#F59E0B",
  supply_sentinel: "#3B82F6",
  recipe_chemist: "#A78BFA",
};

const AGENT_NAMES: Record<string, string> = {
  orchestrator: "ORCHESTRATOR",
  maintenance_prophet: "MAINTENANCE PROPHET",
  supply_sentinel: "SUPPLY SENTINEL",
  recipe_chemist: "RECIPE CHEMIST",
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", { hour12: false });
}

function StreamCard({ entry }: { entry: StreamEntry }) {
  const color = AGENT_COLORS[entry.agentId] ?? "#FAFAFA";
  const isActive = entry.status === "active";

  return (
    <div
      className="flex gap-2.5 fade-up"
      style={{ borderLeft: `2px solid ${color}`, paddingLeft: 10 }}
    >
      {/* Meta row */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color }}>{AGENT_ICONS[entry.agentId]}</span>
          <span
            className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color }}
          >
            {AGENT_NAMES[entry.agentId] ?? entry.agentId}
          </span>
          <span className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>
            {fmtTime(entry.startTime)}
          </span>
          {isActive && (
            <span
              className="w-1 h-1 rounded-full pulse-dot ml-auto"
              style={{ background: color, flexShrink: 0 }}
            />
          )}
        </div>

        {/* Tool calls */}
        {entry.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {entry.toolCalls.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
                style={{
                  background: color + "12",
                  border: `1px solid ${color}30`,
                  color: "var(--text-tertiary)",
                }}
              >
                <Zap size={8} strokeWidth={1.5} />
                <span className="font-mono text-[9px]">{t}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reasoning text */}
        <p
          className={`font-sans text-[12px] leading-relaxed whitespace-pre-wrap break-words ${isActive ? "stream-caret" : ""}`}
          style={{ color: "var(--text-secondary)" }}
        >
          {entry.text || (isActive ? "" : "—")}
        </p>

        {/* Done summary → one line */}
        {entry.status === "done" && entry.output && (
          <div
            className="flex items-center gap-1.5 mt-2 pt-2"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <ArrowRight size={10} strokeWidth={2} style={{ color, flexShrink: 0 }} />
            <span className="font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {_oneLiner(entry.output)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function _oneLiner(output: Record<string, unknown>): string {
  const rec = output.recommendation as Record<string, unknown> | undefined;
  if (!rec) return "Analysis complete.";
  if (rec.diagnosis) return String(rec.diagnosis).slice(0, 80);
  if (rec.disruption_summary) return String(rec.disruption_summary).slice(0, 80);
  if (rec.original_product) return `Clean-label reformulation for: ${rec.original_product}`;
  return "Analysis complete.";
}

function FinalCard({ rec }: { rec: Record<string, unknown> }) {
  const summary = rec.summary as string | undefined;
  const specRec = rec.specialist_recommendation as Record<string, unknown> | undefined;
  const sr = specRec ?? {};

  return (
    <div
      className="rounded-md p-4"
      style={{
        background: "rgba(245,158,11,0.05)",
        border: "1px solid rgba(245,158,11,0.25)",
        boxShadow: "0 0 20px rgba(245,158,11,0.06)",
      }}
    >
      <div
        className="font-mono text-[9px] uppercase tracking-[0.18em] mb-2"
        style={{ color: "var(--accent)" }}
      >
        Final Recommendation
      </div>

      {summary && (
        <p className="font-sans text-[12px] leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
          {summary}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {_kv("Diagnosis", sr.diagnosis ?? sr.disruption_summary)}
        {_kv("Action", sr.recommended_action)}
        {_kv("Window", sr.optimal_maintenance_window)}
        {_kv("Affected", sr.affected_products)}

        {sr.predicted_failure_window_hours !== undefined && (
          <div className="rounded-sm p-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="font-display text-[20px]" style={{ color: "var(--status-danger)" }}>
              {String(sr.predicted_failure_window_hours)}h
            </div>
            <div className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>to failure</div>
          </div>
        )}

        {sr.confidence !== undefined && (
          <div className="rounded-sm p-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
            <div className="font-display text-[20px]" style={{ color: "var(--status-info)" }}>
              {Math.round(Number(sr.confidence) * 100)}%
            </div>
            <div className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>confidence</div>
          </div>
        )}

        {sr.cost_of_action_usd !== undefined && (
          <div className="rounded-sm p-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
            <div className="font-mono text-[14px] font-medium tabular" style={{ color: "var(--accent)" }}>
              ${Number(sr.cost_of_action_usd).toLocaleString()}
            </div>
            <div className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>cost of action</div>
          </div>
        )}

        {sr.cost_of_inaction_usd !== undefined && (
          <div className="rounded-sm p-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="font-mono text-[14px] font-medium tabular" style={{ color: "var(--status-danger)" }}>
              ${Number(sr.cost_of_inaction_usd).toLocaleString()}
            </div>
            <div className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>cost of inaction</div>
          </div>
        )}

        {sr.estimated_cost_impact_usd !== undefined && (
          <div className="rounded-sm p-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="font-mono text-[14px] font-medium tabular" style={{ color: "var(--status-danger)" }}>
              ${Number(sr.estimated_cost_impact_usd).toLocaleString()}
            </div>
            <div className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>cost impact</div>
          </div>
        )}

        {sr.total_cost_delta_pct !== undefined && (
          <div className="rounded-sm p-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
            <div className="font-mono text-[14px] font-medium" style={{ color: "var(--agent-recipe)" }}>
              +{Number(sr.total_cost_delta_pct).toFixed(1)}%
            </div>
            <div className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>reformulation cost</div>
          </div>
        )}
      </div>
    </div>
  );
}

function _kv(label: string, val: unknown): React.ReactNode {
  if (val === undefined || val === null) return null;
  const text = Array.isArray(val) ? (val as string[]).join(", ") : String(val);
  if (!text) return null;
  return (
    <div
      key={label}
      className="col-span-2 rounded-sm px-2 py-1.5"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
    >
      <span className="font-mono text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>{label}: </span>
      <span className="font-sans text-[11px]" style={{ color: "var(--text-secondary)" }}>{text}</span>
    </div>
  );
}

export default function ActiveStream() {
  const entries = useAgentStore((s) => s.streamEntries);
  const finalRec = useAgentStore((s) => s.finalRecommendation);
  const scenarioName = useAgentStore((s) => s.scenarioName);
  const isRunning = useAgentStore((s) => s.isRunning);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, finalRec]);

  return (
    <div
      className="flex flex-col border-l"
      style={{ width: 400, borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--text-muted)" }}
        >
          Active Stream
        </span>
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--status-running)" }} />
            <span className="font-mono text-[9px] uppercase" style={{ color: "var(--status-running)" }}>Live</span>
          </div>
        )}
        {scenarioName && !isRunning && (
          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            {scenarioName}
          </span>
        )}
      </div>

      {/* Stream body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {entries.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full text-center"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="font-mono text-[11px] mb-1">No active scenario</span>
            <span className="font-mono text-[10px]">Use the command bar below to trigger a scenario</span>
          </div>
        )}

        {entries.map((entry) => (
          <StreamCard key={entry.id} entry={entry} />
        ))}

        {finalRec && (
          <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 16, marginTop: 4 }}>
            <FinalCard rec={finalRec} />
          </div>
        )}
      </div>
    </div>
  );
}
