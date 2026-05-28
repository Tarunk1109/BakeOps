import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Wrench, ShieldAlert, FlaskConical, Network,
  ArrowRight, Zap, ChevronDown, ChevronRight as ChevronRightSmall,
  Volume2, VolumeX, Camera, CheckCircle2, Cpu,
} from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import type { StreamEntry, ChatMessage } from "../store/agentStore";
import SpeedComparison from "./SpeedComparison";
import SavingsCard from "./SavingsCard";

// ─── Dark-panel agent colors ──────────────────────────────────────────────────
const AGENT_COLORS: Record<string, string> = {
  orchestrator:        "#E8E8E4",
  maintenance_prophet: "#F59E0B",
  supply_sentinel:     "#60A5FA",
  recipe_chemist:      "#A78BFA",
};
const AGENT_ICONS: Record<string, React.ReactNode> = {
  orchestrator:        <Network      size={11} strokeWidth={1.5} />,
  maintenance_prophet: <Wrench       size={11} strokeWidth={1.5} />,
  supply_sentinel:     <ShieldAlert  size={11} strokeWidth={1.5} />,
  recipe_chemist:      <FlaskConical size={11} strokeWidth={1.5} />,
};
const AGENT_NAMES: Record<string, string> = {
  orchestrator:        "Orchestrator",
  maintenance_prophet: "Maintenance Prophet",
  supply_sentinel:     "Supply Sentinel",
  recipe_chemist:      "Recipe Chemist",
};

// ─── Contextual hints ─────────────────────────────────────────────────────────
const HINTS: Record<string, string[]> = {
  maintenance: [
    "Analysing equipment telemetry…",
    "Correlating vibration signatures…",
    "Predicting failure cascade…",
    "Calculating optimal maintenance window…",
    "Estimating remaining useful life…",
    "Cross-referencing service history…",
  ],
  supply: [
    "Scanning supplier network…",
    "Assessing inventory buffer levels…",
    "Identifying alternative sourcing routes…",
    "Modelling shortage impact on production…",
    "Calculating lead-time risk…",
    "Evaluating procurement options…",
  ],
  recipe: [
    "Parsing ingredient declarations…",
    "Cross-referencing food additives database…",
    "Formulating clean-label alternatives…",
    "Calculating reformulation cost delta…",
    "Verifying CFIA compliance requirements…",
    "Checking Open Food Facts database…",
  ],
  default: [
    "Routing to specialist agents…",
    "Running parallel analysis…",
    "Evaluating factory state…",
    "Cross-referencing historical patterns…",
    "Synthesising recommendations…",
    "Preparing executive summary…",
  ],
};

function getHints(scenario: string): string[] {
  const s = scenario.toLowerCase();
  if (/oven|tunnel|equipment|maintenance|bearing|vibration|degradation|health|heating/.test(s)) return HINTS.maintenance;
  if (/yeast|wheat|flour|supplier|supply|shortage|inventory|procurement|lallemand|allocation/.test(s)) return HINTS.supply;
  if (/recipe|label|reformulat|ingredient|clean|additive|cfia|croissant|costco|calcium|propionate/.test(s)) return HINTS.recipe;
  return HINTS.default;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function inlineMd(text: string, light?: boolean): React.ReactNode {
  const boldColor = light ? "#0E0E10" : "#FAFAF7";
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} style={{ color: boldColor, fontWeight: 600 }}>
        {p.slice(2, -2)}
      </strong>
    ) : p
  );
}

function renderMarkdown(text: string, light?: boolean): React.ReactNode {
  const textColor   = light ? "#3A3A3E" : "var(--paper-secondary)";
  const bulletColor = light ? "#B45309" : "var(--agent-maintenance-dark)";
  const headerColor = light ? "#78350F" : "var(--agent-maintenance-dark)";

  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let key = 0, i = 0;

  while (i < lines.length) {
    const t = lines[i].trimStart();
    if (!t) { out.push(<div key={key++} style={{ height: 5 }} />); i++; continue; }

    if (/^[*\-]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[*\-]\s/.test(lines[i].trimStart())) {
        items.push(lines[i].trimStart().replace(/^[*\-]\s+/, "")); i++;
      }
      out.push(
        <ul key={key++} style={{ margin: "4px 0", padding: 0, listStyle: "none" }}>
          {items.map((item, j) => (
            <li key={j} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
              <span style={{ color: bulletColor, flexShrink: 0, marginTop: 2, fontSize: 10 }}>▸</span>
              <span className="font-sans" style={{ fontSize: 13, lineHeight: 1.65, color: textColor }}>
                {inlineMd(item, light)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    if (t.startsWith("##")) {
      out.push(
        <div key={key++} className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 9, color: headerColor, marginTop: 12, marginBottom: 5 }}>
          {t.replace(/^#+\s*/, "")}
        </div>
      );
      i++; continue;
    }
    out.push(
      <p key={key++} className="font-sans" style={{ fontSize: 13, lineHeight: 1.65, color: textColor, margin: "2px 0" }}>
        {inlineMd(t, light)}
      </p>
    );
    i++;
  }
  return <>{out}</>;
}

// ─── Voice synthesis ──────────────────────────────────────────────────────────
function speakRecommendation(rec: Record<string, unknown>) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const sr    = (rec.specialist_recommendation ?? rec) as Record<string, unknown>;
  const diag  = String(sr.diagnosis ?? sr.disruption_summary ?? sr.original_product ?? "Analysis complete");
  const action = String(sr.recommended_action ?? "");
  const conf   = sr.confidence !== undefined ? Math.round(Number(sr.confidence) * 100) : null;
  const confStr = conf !== null ? `Confidence: ${conf} percent.` : "";

  const text = `Diagnosis: ${diag}. ${action ? `Recommended action: ${action}.` : ""} ${confStr}`.trim();

  const utterance  = new SpeechSynthesisUtterance(text);
  utterance.rate   = 0.9;
  utterance.pitch  = 1.0;
  utterance.volume = 0.85;

  const voices = window.speechSynthesis.getVoices();
  const best   = voices.find(v =>
    v.name.includes("Samantha") ||
    v.name.includes("Google US English") ||
    v.name === "Karen"
  ) ?? voices.find(v => v.lang.startsWith("en"));
  if (best) utterance.voice = best;

  window.speechSynthesis.speak(utterance);
}

// ─── ThinkingLoader ───────────────────────────────────────────────────────────
const BAR_HEIGHTS = [0.3, 0.55, 0.8, 1, 0.7, 0.5, 0.85, 0.6, 0.38];

function ThinkingLoader({ scenario }: { scenario: string }) {
  const hints   = useMemo(() => getHints(scenario), [scenario]);
  const [idx, setIdx]   = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      const tid = setTimeout(() => { setIdx((n) => (n + 1) % hints.length); setFade(true); }, 300);
      return () => clearTimeout(tid);
    }, 2600);
    return () => clearInterval(id);
  }, [hints]);

  return (
    <div className="flex flex-col items-center gap-3 py-10">
      {/* Waveform bars */}
      <div className="flex items-center gap-[3px]" style={{ height: 24 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <div key={i} style={{
            width: 3, height: `${h * 100}%`, borderRadius: 2,
            background: "var(--agent-maintenance-dark)",
            transformOrigin: "bottom",
            animation: `thinking-bar 1.1s ease-in-out ${i * 0.085}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* Rotating hint */}
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          color: "var(--paper-tertiary)",
          opacity: fade ? 1 : 0,
          transition: "opacity 0.3s ease",
          letterSpacing: "0.04em",
        }}
      >
        {hints[idx]}
      </span>

      {/* Subtle label */}
      <div className="flex items-center gap-2">
        <Cpu size={9} style={{ color: "var(--paper-tertiary)", opacity: 0.5 }} />
        <span className="font-mono uppercase tracking-[0.14em]" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.5 }}>
          Multi-agent reasoning active
        </span>
      </div>
    </div>
  );
}

// ─── StreamCard ───────────────────────────────────────────────────────────────
function StreamCard({ entry, delay = 0 }: { entry: StreamEntry; delay?: number }) {
  const [expanded, setExpanded] = useState(false);
  const color    = AGENT_COLORS[entry.agentId] ?? "#E8E8E4";
  const isActive = entry.status === "active";
  const isDone   = entry.status === "done";

  const preview = isActive
    ? (entry.text.length > 120 ? "…" + entry.text.slice(-120) : entry.text)
    : (entry.text.length > 140 ? entry.text.slice(0, 140) + "…" : entry.text);

  return (
    <div
      className="fade-up rounded-lg overflow-hidden"
      style={{
        animationDelay: `${delay}ms`,
        background: isActive
          ? `linear-gradient(135deg, rgba(${colorToRgb(color)}, 0.04) 0%, transparent 100%)`
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? color + "22" : "rgba(255,255,255,0.05)"}`,
        borderLeft: `2px solid ${isDone ? "rgba(21,128,61,0.6)" : color}`,
        padding: "12px 14px",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color, flexShrink: 0 }}>{AGENT_ICONS[entry.agentId]}</span>
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: 9, color }}>
          {AGENT_NAMES[entry.agentId] ?? entry.agentId}
        </span>
        <span className="font-mono" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.7 }}>
          {fmtTime(entry.startTime)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isActive && (
            <div className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full pulse-dot" style={{ background: color }} />
              <span className="font-mono uppercase" style={{ fontSize: 8, color, letterSpacing: "0.1em" }}>Thinking</span>
            </div>
          )}
          {isDone && (
            <div className="flex items-center gap-1">
              <CheckCircle2 size={9} style={{ color: "#4ADE80" }} strokeWidth={2} />
              <span className="font-mono uppercase" style={{ fontSize: 8, color: "#4ADE80", letterSpacing: "0.1em" }}>Done</span>
            </div>
          )}
        </div>
      </div>

      {/* Tool badges */}
      {entry.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entry.toolCalls.map((t, i) => (
            <div key={i}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm fade-up"
              style={{
                animationDelay: `${i * 50}ms`,
                background: color + "12",
                border: `1px solid ${color}20`,
              }}>
              <Zap size={7} strokeWidth={1.5} style={{ color: color + "BB" }} />
              <span className="font-mono" style={{ fontSize: 8, color: "var(--paper-tertiary)" }}>{t}</span>
            </div>
          ))}
        </div>
      )}

      {/* Text preview */}
      {preview && (
        <p className={`font-mono leading-relaxed ${isActive ? "stream-cursor" : ""}`}
          style={{ fontSize: 10.5, color: "var(--paper-tertiary)", lineHeight: 1.7 }}>
          {preview}
        </p>
      )}

      {/* Expanded view */}
      {expanded && entry.text && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border-ink-soft)" }}>
          <p className="font-sans leading-relaxed whitespace-pre-wrap break-words"
            style={{ fontSize: 12.5, color: "var(--paper-secondary)", lineHeight: 1.7 }}>
            {entry.text}
          </p>
        </div>
      )}

      {/* One-liner when done */}
      {isDone && entry.output && !expanded && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <ArrowRight size={9} strokeWidth={2} style={{ color: "#4ADE80", flexShrink: 0 }} />
          <span className="font-mono" style={{ fontSize: 9, color: "var(--paper-tertiary)" }}>
            {_oneLiner(entry.output)}
          </span>
        </div>
      )}

      {/* Expand / collapse */}
      {entry.text.length > 60 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 mt-1.5 hover:opacity-100"
          style={{ color: "var(--paper-tertiary)", opacity: 0.5, cursor: "pointer", transition: "opacity 0.15s" }}
        >
          {expanded
            ? <ChevronDown size={9} strokeWidth={2} />
            : <ChevronRightSmall size={9} strokeWidth={2} />}
          <span className="font-mono" style={{ fontSize: 9 }}>
            {expanded ? "Collapse reasoning" : `Show reasoning · ${entry.text.length.toLocaleString()} chars`}
          </span>
        </button>
      )}
    </div>
  );
}

// ─── FinalCard ────────────────────────────────────────────────────────────────
function FinalCard({ rec, runCount }: { rec: Record<string, unknown>; runCount: number }) {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try { return localStorage.getItem("bakeops_voice") === "1"; } catch { return false; }
  });
  const [confVisible, setConfVisible]   = useState(false);

  const summary    = rec.summary as string | undefined;
  const specRec    = rec.specialist_recommendation as Record<string, unknown> | undefined;
  const sr         = specRec ?? {};
  const allOutputs = rec.all_specialist_outputs as Record<string, unknown>[] | undefined;
  const agentsResp = allOutputs?.length ?? 1;
  const confidence = sr.confidence !== undefined ? Number(sr.confidence) : null;

  // Animate confidence bar after mount
  useEffect(() => {
    const id = setTimeout(() => setConfVisible(true), 300);
    return () => clearTimeout(id);
  }, []);

  // Voice on arrival
  useEffect(() => {
    if (!voiceEnabled) return;
    const id = setTimeout(() => speakRecommendation(rec), 600);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((v) => {
      const next = !v;
      try { localStorage.setItem("bakeops_voice", next ? "1" : "0"); } catch {/* */}
      if (next) speakRecommendation(rec);
      else window.speechSynthesis?.cancel();
      return next;
    });
  }, [rec]);

  const bigNumbers = [
    sr.predicted_failure_window_hours !== undefined && {
      value: String(sr.predicted_failure_window_hours),
      unit: "hrs", label: "To failure", danger: true,
    },
    sr.cost_of_action_usd !== undefined && {
      value: `$${Number(sr.cost_of_action_usd).toLocaleString()}`,
      unit: "", label: "Cost of action", danger: false,
    },
    sr.cost_of_inaction_usd !== undefined && {
      value: `$${Number(sr.cost_of_inaction_usd).toLocaleString()}`,
      unit: "", label: "Cost of inaction", danger: true,
    },
    sr.estimated_cost_impact_usd !== undefined && {
      value: `$${Number(sr.estimated_cost_impact_usd).toLocaleString()}`,
      unit: "", label: "Cost impact", danger: true,
    },
    sr.total_cost_delta_pct !== undefined && {
      value: `+${Number(sr.total_cost_delta_pct).toFixed(1)}`,
      unit: "%", label: "Reformulation cost", danger: false, purple: true,
    },
  ].filter(Boolean) as { value: string; unit: string; label: string; danger: boolean; purple?: boolean }[];

  const kvPairs: [string, unknown][] = [
    ["Diagnosis",          sr.diagnosis ?? sr.disruption_summary],
    ["Recommended Action", sr.recommended_action],
    ["Maintenance Window", sr.optimal_maintenance_window],
    ["Affected Products",  sr.affected_products],
  ];

  const refNum = `BO-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return (
    <div
      className="rounded-xl overflow-hidden rec-arrive"
      style={{
        background: "#F9F7F2",
        border: "1px solid rgba(180,83,9,0.15)",
        borderTop: "3px solid #B45309",
        boxShadow: "0 8px 32px rgba(14,14,16,0.14), 0 2px 8px rgba(14,14,16,0.06)",
      }}
    >
      {/* Memo header */}
      <div
        className="px-5 pt-4 pb-3 flex items-start justify-between"
        style={{ borderBottom: "1px solid rgba(180,83,9,0.10)" }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-mono uppercase tracking-[0.22em]"
            style={{ fontSize: 8, color: "#B45309", letterSpacing: "0.2em" }}>
            BakeOps Intelligence Report
          </span>
          <span className="font-display font-medium"
            style={{ fontSize: 18, color: "#0E0E10", letterSpacing: "-0.015em" }}>
            Operational Recommendation
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono" style={{ fontSize: 8, color: "#A8A8AE" }}>
            REF · {refNum}
          </span>
          <button
            onClick={toggleVoice}
            className="flex items-center gap-1.5 px-2 py-1 rounded"
            title={voiceEnabled ? "Mute voice" : "Enable voice readout"}
            style={{
              background: voiceEnabled ? "rgba(180,83,9,0.08)" : "transparent",
              border: `1px solid ${voiceEnabled ? "rgba(180,83,9,0.20)" : "rgba(14,14,16,0.10)"}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {voiceEnabled
              ? <Volume2 size={10} style={{ color: "#B45309" }} />
              : <VolumeX  size={10} style={{ color: "#A8A8AE" }} />}
            <span className="font-mono" style={{ fontSize: 8, color: voiceEnabled ? "#B45309" : "#A8A8AE" }}>
              {voiceEnabled ? "Voice on" : "Muted"}
            </span>
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Summary */}
        {summary && (
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(14,14,16,0.07)" }}>
            {renderMarkdown(summary, true)}
          </div>
        )}

        {/* Big numbers — staggered */}
        {bigNumbers.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {bigNumbers.map(({ value, unit, label, danger, purple }, bi) => (
              <div
                key={label}
                className="flex-1 rounded-lg p-3 min-w-[80px] fade-up"
                style={{
                  animationDelay: `${bi * 60}ms`,
                  background: danger ? "rgba(185,28,28,0.05)" : purple ? "rgba(109,40,217,0.04)" : "rgba(14,14,16,0.03)",
                  border: `1px solid ${danger ? "rgba(185,28,28,0.14)" : purple ? "rgba(109,40,217,0.14)" : "rgba(14,14,16,0.07)"}`,
                }}>
                <div
                  className="font-display leading-none font-medium tabular"
                  style={{
                    fontSize: value.length > 7 ? 15 : 22,
                    color: danger ? "#B91C1C" : purple ? "#6D28D9" : "#1D4ED8",
                    letterSpacing: "-0.02em",
                  }}>
                  {value}
                  {unit && <span className="font-mono ml-0.5" style={{ fontSize: 9, opacity: 0.7 }}>{unit}</span>}
                </div>
                <div className="font-mono uppercase mt-1.5" style={{ fontSize: 8, color: "#9CA3AF", letterSpacing: "0.1em" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Confidence gauge */}
        {confidence !== null && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: 9, color: "#9CA3AF" }}>
                Confidence
              </span>
              <span
                className="font-mono tabular font-semibold"
                style={{
                  fontSize: 12,
                  color: confidence >= 0.8 ? "#15803D" : confidence >= 0.6 ? "#B45309" : "#B91C1C",
                }}
              >
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div style={{ height: 4, background: "rgba(14,14,16,0.07)", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  width: confVisible ? `${confidence * 100}%` : "0%",
                  height: "100%",
                  borderRadius: 3,
                  background: confidence >= 0.8
                    ? "linear-gradient(90deg, #15803D, #4ADE80)"
                    : confidence >= 0.6
                    ? "linear-gradient(90deg, #B45309, #F59E0B)"
                    : "linear-gradient(90deg, #B91C1C, #F87171)",
                  transition: "width 1.0s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </div>
          </div>
        )}

        {/* KV pairs — staggered */}
        <div className="flex flex-col gap-2">
          {kvPairs.map(([label, val], ki) => {
            if (!val) return null;
            const text = Array.isArray(val) ? (val as string[]).join(", ") : String(val);
            if (!text.trim()) return null;
            return (
              <div
                key={label}
                className="rounded-lg px-3 py-2.5 fade-up"
                style={{
                  animationDelay: `${ki * 50 + 100}ms`,
                  background: "rgba(14,14,16,0.03)",
                  border: "1px solid rgba(14,14,16,0.06)",
                }}>
                <div className="font-mono uppercase tracking-wider mb-1"
                  style={{ fontSize: 8, color: "#9CA3AF", letterSpacing: "0.12em" }}>
                  {label}
                </div>
                <div>{renderMarkdown(text, true)}</div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: "1px solid rgba(180,83,9,0.10)" }}
        >
          <span className="font-mono italic" style={{ fontSize: 9.5, color: "#A8A8AE" }}>
            Signed by BakeOps Orchestrator
            {confidence !== null && ` · ${Math.round(confidence * 100)}% confidence`}
          </span>
          <div className="flex items-center gap-2.5">
            <span className="font-mono" style={{ fontSize: 8.5, color: "#A8A8AE" }}>
              Run #{runCount} · {agentsResp} agent{agentsResp !== 1 ? "s" : ""}
            </span>
            <span
              className="font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                fontSize: 8.5, color: "#15803D",
                background: "rgba(21,128,61,0.08)",
                border: "1px solid rgba(21,128,61,0.18)",
              }}
            >
              Low Variance
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", { hour12: false });
}

function _oneLiner(output: Record<string, unknown>): string {
  const rec = output.recommendation as Record<string, unknown> | undefined;
  if (!rec) return "Analysis complete.";
  if (rec.diagnosis)          return String(rec.diagnosis).slice(0, 90);
  if (rec.disruption_summary) return String(rec.disruption_summary).slice(0, 90);
  if (rec.original_product)   return `Clean-label reformulation: ${rec.original_product}`;
  return "Analysis complete.";
}

function colorToRgb(hex: string): string {
  // Handle named-ish colors vs hex
  if (!hex.startsWith("#")) return "255, 255, 255";
  const r = parseInt(hex.slice(1, 3), 16) || 255;
  const g = parseInt(hex.slice(3, 5), 16) || 255;
  const b = parseInt(hex.slice(5, 7), 16) || 255;
  return `${r}, ${g}, ${b}`;
}

// ─── LabelScanCard ────────────────────────────────────────────────────────────
function LabelScanCard() {
  const labelScan = useAgentStore((s) => s.labelScan);
  if (!labelScan) return null;

  return (
    <div
      className="fade-up rounded-lg"
      style={{
        background: "rgba(167,139,250,0.05)",
        border: "1px solid rgba(167,139,250,0.14)",
        borderLeft: "2px solid #A78BFA",
        padding: "12px 14px",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Camera size={10} style={{ color: "#A78BFA" }} strokeWidth={1.5} />
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: 9, color: "#A78BFA" }}>
          Label Scanner
        </span>
        {labelScan.scanning && (
          <div className="ml-auto flex items-center gap-1">
            <span className="w-1 h-1 rounded-full pulse-dot" style={{ background: "#A78BFA" }} />
            <span className="font-mono" style={{ fontSize: 8, color: "#A78BFA" }}>Reading</span>
          </div>
        )}
      </div>

      {labelScan.scanning ? (
        <p className="font-mono stream-cursor" style={{ fontSize: 10.5, color: "var(--paper-tertiary)" }}>
          Analyzing label with computer vision
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: "var(--paper-primary)", letterSpacing: "-0.01em" }}>
              {labelScan.product_name}
            </span>
            {labelScan.brand && labelScan.brand !== "Unknown" && (
              <span className="font-mono ml-2" style={{ fontSize: 9, color: "var(--paper-tertiary)" }}>
                by {labelScan.brand}
              </span>
            )}
          </div>
          {labelScan.ingredients && (
            <p className="font-sans" style={{ fontSize: 11, color: "var(--paper-tertiary)", lineHeight: 1.65 }}>
              {labelScan.ingredients.length > 200
                ? labelScan.ingredients.slice(0, 200) + "…"
                : labelScan.ingredients}
            </p>
          )}
          {labelScan.allergens?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {labelScan.allergens.map((a, i) => (
                <span key={i} className="font-mono px-1.5 py-0.5 rounded-sm"
                  style={{ fontSize: 8.5, background: "rgba(185,28,28,0.1)", color: "#F87171", border: "1px solid rgba(185,28,28,0.18)" }}>
                  ⚠ {a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TelegramBadge ────────────────────────────────────────────────────────────
function TelegramBadge() {
  const alertSent = useAgentStore((s) => s.alertSent);
  if (!alertSent) return null;

  const ts = (() => {
    try {
      return new Date(alertSent.timestamp).toLocaleTimeString("en-CA", { hour12: false });
    } catch { return ""; }
  })();

  return (
    <div
      className="flex items-center gap-2 scale-in"
      style={{
        padding: "8px 12px",
        background: "rgba(21,128,61,0.05)",
        border: "1px solid rgba(21,128,61,0.14)",
        borderRadius: 8,
      }}
    >
      <CheckCircle2 size={11} style={{ color: "#4ADE80", flexShrink: 0 }} strokeWidth={1.5} />
      <span className="font-mono" style={{ fontSize: 10, color: "#4ADE80" }}>
        Alert delivered to Plant Manager via Telegram
        {ts && <span style={{ color: "var(--paper-tertiary)", marginLeft: 6 }}>· {ts}</span>}
      </span>
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} fade-up`}>
      {!isUser && (
        <div className="mr-2 mt-1.5 shrink-0">
          <Network size={9} style={{ color: "rgba(255,255,255,0.4)" }} strokeWidth={1.5} />
        </div>
      )}
      <div style={{
        maxWidth: "82%",
        padding: "8px 12px",
        borderRadius: isUser ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
        background: isUser ? "rgba(180,83,9,0.16)" : "rgba(255,255,255,0.05)",
        border: isUser ? "1px solid rgba(180,83,9,0.25)" : "1px solid rgba(255,255,255,0.07)",
      }}>
        <p
          className={`font-sans leading-relaxed ${!isUser && msg.streaming ? "stream-cursor" : ""}`}
          style={{ fontSize: 12.5, color: isUser ? "#FCE9C9" : "var(--paper-secondary)", whiteSpace: "pre-wrap" }}
        >
          {msg.content || (msg.streaming ? "" : "…")}
        </p>
      </div>
    </div>
  );
}

function ChatPanel() {
  const chatMessages = useAgentStore((s) => s.chatMessages);
  if (chatMessages.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5" style={{ borderTop: "1px solid var(--border-ink)", paddingTop: 14 }}>
      <div className="flex items-center gap-2">
        <div className="w-1 h-1 rounded-full" style={{ background: "var(--accent)" }} />
        <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 8.5, color: "var(--paper-tertiary)" }}>
          Follow-up
        </span>
      </div>
      {chatMessages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
    </div>
  );
}

// ─── ActiveStream ─────────────────────────────────────────────────────────────
export default function ActiveStream() {
  const entries      = useAgentStore((s) => s.streamEntries);
  const finalRec     = useAgentStore((s) => s.finalRecommendation);
  const scenarioName = useAgentStore((s) => s.scenarioName);
  const isRunning    = useAgentStore((s) => s.isRunning);
  const runCount     = useAgentStore((s) => s.runCount);
  const labelScan    = useAgentStore((s) => s.labelScan);
  const isChatting   = useAgentStore((s) => s.isChatting);
  const chatMessages = useAgentStore((s) => s.chatMessages);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const finalCardRef = useRef<HTMLDivElement>(null);

  // Chase bottom while streaming or chatting
  useEffect(() => {
    if (!isRunning && !isChatting) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, isRunning, isChatting, chatMessages]);

  // Scroll to top of FinalCard when rec arrives
  useEffect(() => {
    if (!finalRec || isRunning) return;
    const id = setTimeout(() => {
      const card      = finalCardRef.current;
      const container = scrollRef.current;
      if (!card || !container) return;
      container.scrollTo({ top: card.offsetTop - 16, behavior: "smooth" });
    }, 80);
    return () => clearTimeout(id);
  }, [finalRec, isRunning]);

  const isEmpty = !isRunning && entries.length === 0 && !finalRec && !labelScan;

  return (
    <div
      className="flex flex-col"
      style={{
        flex: 1,
        minHeight: 0,
        background: "var(--bg-ink)",
        borderLeft: "1px solid var(--border-hairline)",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-ink)" }}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 9.5, color: "var(--paper-tertiary)" }}>
            Agent Stream
          </span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--agent-maintenance-dark)" }} />
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 8, color: "var(--agent-maintenance-dark)" }}>Live</span>
          </div>
        )}
        {!isRunning && scenarioName && (
          <span className="font-mono" style={{ fontSize: 9.5, color: "var(--paper-tertiary)", opacity: 0.7 }}>
            {scenarioName.slice(0, 26)}{scenarioName.length > 26 ? "…" : ""}
          </span>
        )}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto dark-scroll p-5 flex flex-col gap-4">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-60">
            <div className="flex items-center gap-[3px]" style={{ height: 20, opacity: 0.4 }}>
              {[0.4, 0.65, 0.85, 0.5, 0.75, 0.4, 0.9, 0.6, 0.45].map((h, i) => (
                <div key={i} style={{
                  width: 3, height: `${h * 100}%`, borderRadius: 2,
                  background: "var(--paper-tertiary)",
                  opacity: 0.3 + h * 0.3,
                }} />
              ))}
            </div>
            <span className="font-display italic" style={{ fontSize: 15, color: "var(--paper-tertiary)" }}>
              Awaiting scenario
            </span>
            <span className="font-mono text-center" style={{ fontSize: 9.5, color: "var(--paper-tertiary)", opacity: 0.5, lineHeight: 1.8 }}>
              Tap NFC · speak a scenario · scan label<br />
              or pick a preset below
            </span>
          </div>
        )}

        {/* Label scan */}
        {labelScan && <LabelScanCard />}

        {/* Thinking loader */}
        {isRunning && <ThinkingLoader scenario={scenarioName} />}

        {/* Stream cards — staggered */}
        {entries.map((entry, i) => (
          <StreamCard key={entry.id} entry={entry} delay={i * 30} />
        ))}

        {/* Final recommendation + accessories */}
        {finalRec && !isRunning && (
          <>
            <div ref={finalCardRef}>
              <FinalCard rec={finalRec} runCount={runCount} />
            </div>
            <SavingsCard rec={finalRec} />
            <TelegramBadge />
            <SpeedComparison />
            <ChatPanel />
          </>
        )}
      </div>
    </div>
  );
}
