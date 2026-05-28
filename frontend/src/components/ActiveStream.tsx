import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Wrench, ShieldAlert, FlaskConical, Network,
  ArrowRight, Zap, ChevronDown, ChevronRight as ChevronRightSmall,
  Volume2, VolumeX, Camera, CheckCircle2,
} from "lucide-react";
import { useAgentStore } from "../store/agentStore";
import type { StreamEntry, ChatMessage } from "../store/agentStore";
import SpeedComparison from "./SpeedComparison";

// ─── Dark-panel agent colors ──────────────────────────────────────────────────
const AGENT_COLORS: Record<string, string> = {
  orchestrator:        "#FAFAF7",
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
    "Analysing equipment telemetry...",
    "Correlating vibration signatures...",
    "Predicting failure cascade...",
    "Calculating optimal maintenance window...",
    "Estimating remaining useful life...",
    "Cross-referencing service history...",
  ],
  supply: [
    "Scanning supplier network...",
    "Assessing inventory buffer levels...",
    "Identifying alternative sourcing routes...",
    "Modelling shortage impact on production...",
    "Calculating lead-time risk...",
    "Evaluating procurement options...",
  ],
  recipe: [
    "Parsing ingredient declarations...",
    "Cross-referencing food additives database...",
    "Formulating clean-label alternatives...",
    "Calculating reformulation cost delta...",
    "Verifying CFIA compliance requirements...",
    "Checking Open Food Facts database...",
  ],
  default: [
    "Routing to specialist agents...",
    "Running parallel analysis...",
    "Evaluating factory state...",
    "Cross-referencing historical patterns...",
    "Synthesising recommendations...",
    "Preparing executive summary...",
  ],
};

function getHints(scenario: string): string[] {
  const s = scenario.toLowerCase();
  if (/oven|tunnel|equipment|maintenance|bearing|vibration|degradation|health|heating/.test(s)) return HINTS.maintenance;
  if (/yeast|wheat|flour|supplier|supply|shortage|inventory|procurement|lallemand|allocation/.test(s)) return HINTS.supply;
  if (/recipe|label|reformulat|ingredient|clean|additive|cfia|croissant|costco|calcium|propionate/.test(s)) return HINTS.recipe;
  return HINTS.default;
}

// ─── Markdown renderer (supports dark + light modes) ─────────────────────────
function inlineMd(text: string, light?: boolean): React.ReactNode {
  const boldColor = light ? "#0E0E10" : "var(--paper-primary)";
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
  const textColor    = light ? "#46464A"  : "var(--paper-secondary)";
  const bulletColor  = light ? "#B45309"  : "var(--agent-maintenance-dark)";
  const headerColor  = light ? "#B45309"  : "var(--agent-maintenance-dark)";

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
            <li key={j} style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "flex-start" }}>
              <span style={{ color: bulletColor, flexShrink: 0, marginTop: 1 }}>·</span>
              <span className="font-sans" style={{ fontSize: 13, lineHeight: 1.6, color: textColor }}>
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
          style={{ fontSize: 9, color: headerColor, marginTop: 10, marginBottom: 4 }}>
          {t.replace(/^#+\s*/, "")}
        </div>
      );
      i++; continue;
    }
    out.push(
      <p key={key++} className="font-sans" style={{ fontSize: 13, lineHeight: 1.6, color: textColor, margin: "2px 0" }}>
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

  const sr  = (rec.specialist_recommendation ?? rec) as Record<string, unknown>;
  const diag   = String(sr.diagnosis ?? sr.disruption_summary ?? sr.original_product ?? "Analysis complete");
  const action = String(sr.recommended_action ?? "");
  const conf   = sr.confidence !== undefined ? Math.round(Number(sr.confidence) * 100) : null;
  const confStr = conf !== null ? `Confidence: ${conf} percent.` : "";

  const text = `Diagnosis: ${diag}. ${action ? `Recommended action: ${action}.` : ""} ${confStr}`.trim();

  const utterance  = new SpeechSynthesisUtterance(text);
  utterance.rate   = 0.9;
  utterance.pitch  = 1.0;
  utterance.volume = 0.85;

  const voices  = window.speechSynthesis.getVoices();
  const best    = voices.find(v =>
    v.name.includes("Samantha") ||
    v.name.includes("Google US English") ||
    v.name === "Karen"
  ) ?? voices.find(v => v.lang.startsWith("en"));
  if (best) utterance.voice = best;

  window.speechSynthesis.speak(utterance);
}

// ─── ThinkingLoader ───────────────────────────────────────────────────────────
const BAR_HEIGHTS = [0.35, 0.6, 0.85, 1, 0.75, 0.55, 0.9, 0.65, 0.4];

function ThinkingLoader({ scenario }: { scenario: string }) {
  const hints = useMemo(() => getHints(scenario), [scenario]);
  const [idx, setIdx]   = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      const tid = setTimeout(() => { setIdx((n) => (n + 1) % hints.length); setFade(true); }, 280);
      return () => clearTimeout(tid);
    }, 2500);
    return () => clearInterval(id);
  }, [hints]);

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="flex items-center gap-[3px]" style={{ height: 22 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <div key={i} style={{
            width: 3, height: `${h * 100}%`, borderRadius: 2,
            background: "var(--agent-maintenance-dark)",
            transformOrigin: "bottom",
            animation: `thinking-bar 1.1s ease-in-out ${i * 0.08}s infinite alternate`,
          }} />
        ))}
      </div>
      <span
        className="font-mono"
        style={{ fontSize: 10, color: "var(--paper-tertiary)", opacity: fade ? 1 : 0, transition: "opacity 0.28s ease" }}
      >
        {hints[idx]}
      </span>
    </div>
  );
}

// ─── StreamCard ───────────────────────────────────────────────────────────────
function StreamCard({ entry }: { entry: StreamEntry }) {
  const [expanded, setExpanded] = useState(false);
  const color    = AGENT_COLORS[entry.agentId] ?? "#FAFAF7";
  const isActive = entry.status === "active";
  const isDone   = entry.status === "done";

  const preview = isActive
    ? (entry.text.length > 100 ? "…" + entry.text.slice(-100) : entry.text)
    : (entry.text.length > 120 ? entry.text.slice(0, 120) + "…" : entry.text);

  return (
    <div className="fade-up" style={{ borderLeft: `2px solid ${color}`, paddingLeft: 12 }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color, flexShrink: 0 }}>{AGENT_ICONS[entry.agentId]}</span>
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: 9, color }}>
          {AGENT_NAMES[entry.agentId] ?? entry.agentId}
        </span>
        <span className="font-mono" style={{ fontSize: 9, color: "var(--paper-tertiary)" }}>
          {fmtTime(entry.startTime)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {isActive && <span className="w-1 h-1 rounded-full pulse-dot" style={{ background: color }} />}
          {isDone   && <span className="font-mono uppercase tracking-wider" style={{ fontSize: 9, color: "var(--status-running)" }}>Done</span>}
        </div>
      </div>

      {/* Tool badges */}
      {entry.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {entry.toolCalls.map((t, i) => (
            <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
              style={{ background: color + "14", border: `1px solid ${color}28` }}>
              <Zap size={8} strokeWidth={1.5} style={{ color: "var(--paper-tertiary)" }} />
              <span className="font-mono" style={{ fontSize: 9, color: "var(--paper-tertiary)" }}>{t}</span>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <p className={`font-mono leading-relaxed ${isActive ? "stream-cursor" : ""}`}
          style={{ fontSize: 11, color: "var(--paper-tertiary)" }}>
          {preview}
        </p>
      )}

      {expanded && entry.text && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border-ink-soft)" }}>
          <p className="font-sans leading-relaxed whitespace-pre-wrap break-words"
            style={{ fontSize: 13, color: "var(--paper-secondary)" }}>
            {entry.text}
          </p>
        </div>
      )}

      {isDone && entry.output && !expanded && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <ArrowRight size={9} strokeWidth={2} style={{ color, flexShrink: 0 }} />
          <span className="font-mono" style={{ fontSize: 9, color: "var(--paper-tertiary)" }}>
            {_oneLiner(entry.output)}
          </span>
        </div>
      )}

      {entry.text.length > 60 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 mt-1.5"
          style={{ color: "var(--paper-tertiary)", opacity: 0.6, cursor: "pointer" }}
        >
          {expanded ? <ChevronDown size={9} strokeWidth={2} /> : <ChevronRightSmall size={9} strokeWidth={2} />}
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

  const summary     = rec.summary as string | undefined;
  const specRec     = rec.specialist_recommendation as Record<string, unknown> | undefined;
  const sr          = specRec ?? {};
  const allOutputs  = rec.all_specialist_outputs as Record<string, unknown>[] | undefined;
  const agentsResp  = allOutputs?.length ?? 1;
  const confidence  = sr.confidence !== undefined ? Number(sr.confidence) : null;

  // Voice on arrival
  useEffect(() => {
    if (!voiceEnabled) return;
    // Small delay to let browser register the click interaction
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
      unit: "hrs", label: "to failure", danger: true,
    },
    sr.cost_of_action_usd !== undefined && {
      value: `$${Number(sr.cost_of_action_usd).toLocaleString()}`,
      unit: "", label: "cost of action", danger: false,
    },
    sr.cost_of_inaction_usd !== undefined && {
      value: `$${Number(sr.cost_of_inaction_usd).toLocaleString()}`,
      unit: "", label: "cost of inaction", danger: true,
    },
    sr.estimated_cost_impact_usd !== undefined && {
      value: `$${Number(sr.estimated_cost_impact_usd).toLocaleString()}`,
      unit: "", label: "cost impact", danger: true,
    },
    sr.total_cost_delta_pct !== undefined && {
      value: `+${Number(sr.total_cost_delta_pct).toFixed(1)}`,
      unit: "%", label: "reformulation cost", danger: false, purple: true,
    },
  ].filter(Boolean) as { value: string; unit: string; label: string; danger: boolean; purple?: boolean }[];

  const kvPairs: [string, unknown][] = [
    ["Diagnosis",          sr.diagnosis ?? sr.disruption_summary],
    ["Recommended Action", sr.recommended_action],
    ["Maintenance Window", sr.optimal_maintenance_window],
    ["Affected Products",  sr.affected_products],
  ];

  // Generate reference number
  const refNum = `BO-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Print-memo card on warm paper background
  return (
    <div
      className="rounded-lg overflow-hidden rec-arrive"
      style={{
        background: "#F8F6F0",
        borderTop: "2px solid #B45309",
        border: "1px solid rgba(180,83,9,0.18)",
        borderTopWidth: 2,
        boxShadow: "0 4px 24px rgba(14,14,16,0.18)",
      }}
    >
      {/* Memo header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between"
        style={{ borderBottom: "1px solid rgba(180,83,9,0.12)" }}>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono uppercase tracking-[0.22em]"
            style={{ fontSize: 8, color: "#B45309" }}>
            BakeOps Command Center
          </span>
          <span className="font-display font-medium"
            style={{ fontSize: 16, color: "#0E0E10", letterSpacing: "-0.01em" }}>
            Operational Recommendation
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono" style={{ fontSize: 8, color: "#76767C" }}>
            REF: {refNum}
          </span>
          {/* Voice toggle */}
          <button
            onClick={toggleVoice}
            className="flex items-center gap-1.5 px-2 py-1 rounded"
            title={voiceEnabled ? "Mute voice" : "Enable voice readout"}
            style={{
              background: voiceEnabled ? "rgba(180,83,9,0.08)" : "transparent",
              border: `1px solid ${voiceEnabled ? "rgba(180,83,9,0.22)" : "rgba(14,14,16,0.12)"}`,
              cursor: "pointer",
            }}
          >
            {voiceEnabled
              ? <Volume2 size={10} style={{ color: "#B45309" }} />
              : <VolumeX  size={10} style={{ color: "#76767C" }} />}
            <span className="font-mono" style={{ fontSize: 8, color: voiceEnabled ? "#B45309" : "#76767C" }}>
              {voiceEnabled ? "Voice on" : "Muted"}
            </span>
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Summary — Fraunces serif body, light mode */}
        {summary && (
          <div className="pb-4" style={{ borderBottom: "1px solid rgba(14,14,16,0.08)" }}>
            {renderMarkdown(summary, true)}
          </div>
        )}

        {/* Big numbers */}
        {bigNumbers.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {bigNumbers.map(({ value, unit, label, danger, purple }) => (
              <div key={label} className="flex-1 rounded-md p-3 min-w-[80px]"
                style={{
                  background: danger ? "rgba(185,28,28,0.06)" : "rgba(14,14,16,0.03)",
                  border: `1px solid ${danger ? "rgba(185,28,28,0.16)" : "rgba(14,14,16,0.08)"}`,
                }}>
                <div className="font-display leading-none font-medium"
                  style={{
                    fontSize: value.length > 7 ? 15 : 24,
                    color: danger ? "#B91C1C" : purple ? "#6D28D9" : "#1D4ED8",
                  }}>
                  {value}
                  {unit && <span className="font-mono ml-0.5" style={{ fontSize: 10, opacity: 0.7 }}>{unit}</span>}
                </div>
                <div className="font-mono uppercase mt-1" style={{ fontSize: 9, color: "#76767C" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Confidence gauge */}
        {confidence !== null && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: 9, color: "#76767C" }}>
                Confidence
              </span>
              <span className="font-mono tabular" style={{
                fontSize: 11,
                color: confidence >= 0.8 ? "#15803D" : "#B45309",
                fontWeight: 600,
              }}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div style={{ height: 3, background: "rgba(14,14,16,0.08)", borderRadius: 2 }}>
              <div style={{
                width: `${confidence * 100}%`, height: "100%", borderRadius: 2,
                background: confidence >= 0.8 ? "#15803D" : confidence >= 0.6 ? "#B45309" : "#B91C1C",
                transition: "width 0.8s ease",
              }} />
            </div>
          </div>
        )}

        {/* KV pairs */}
        <div className="flex flex-col gap-1.5">
          {kvPairs.map(([label, val]) => {
            if (!val) return null;
            const text = Array.isArray(val) ? (val as string[]).join(", ") : String(val);
            if (!text.trim()) return null;
            return (
              <div key={label} className="rounded px-3 py-2.5"
                style={{ background: "rgba(14,14,16,0.03)", border: "1px solid rgba(14,14,16,0.07)" }}>
                <div className="font-mono uppercase tracking-wider mb-1"
                  style={{ fontSize: 9, color: "#76767C" }}>
                  {label}
                </div>
                <div>{renderMarkdown(text, true)}</div>
              </div>
            );
          })}
        </div>

        {/* Footer — "Signed by" */}
        <div className="flex items-center justify-between pt-3"
          style={{ borderTop: "1px solid rgba(180,83,9,0.14)" }}>
          <span className="font-mono italic" style={{ fontSize: 10, color: "#76767C" }}>
            Signed by BakeOps Orchestrator
            {confidence !== null && ` · Confidence ${Math.round(confidence * 100)}%`}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono" style={{ fontSize: 9, color: "#76767C" }}>
              Run #{runCount} · {agentsResp} agent{agentsResp !== 1 ? "s" : ""}
            </span>
            <span className="font-mono px-1.5 py-0.5 rounded-sm"
              style={{ fontSize: 9, color: "#15803D", background: "rgba(21,128,61,0.08)", border: "1px solid rgba(21,128,61,0.2)" }}>
              Variance: Low
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

// ─── LabelScanCard ────────────────────────────────────────────────────────────
function LabelScanCard() {
  const labelScan = useAgentStore((s) => s.labelScan);
  if (!labelScan) return null;

  return (
    <div
      className="fade-up rounded-lg overflow-hidden"
      style={{
        borderLeft: "2px solid #A78BFA",
        paddingLeft: 12,
        background: "rgba(167,139,250,0.06)",
        border: "1px solid rgba(167,139,250,0.14)",
        borderLeftWidth: 2,
        borderLeftColor: "#A78BFA",
        padding: "12px 14px",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Camera size={10} style={{ color: "#A78BFA" }} strokeWidth={1.5} />
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: 9, color: "#A78BFA" }}>
          Label Scanner
        </span>
        {labelScan.scanning && (
          <span className="font-mono" style={{ fontSize: 9, color: "var(--paper-tertiary)", marginLeft: "auto" }}>
            Reading…
          </span>
        )}
      </div>

      {labelScan.scanning ? (
        <p className="font-mono stream-cursor" style={{ fontSize: 11, color: "var(--paper-tertiary)" }}>
          Analyzing label with computer vision
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: "var(--paper-primary)", letterSpacing: "-0.01em" }}>
              {labelScan.product_name}
            </span>
            {labelScan.brand && labelScan.brand !== "Unknown" && (
              <span className="font-mono ml-2" style={{ fontSize: 10, color: "var(--paper-tertiary)" }}>
                by {labelScan.brand}
              </span>
            )}
          </div>
          {labelScan.ingredients && (
            <p className="font-sans" style={{ fontSize: 11, color: "var(--paper-tertiary)", lineHeight: 1.6 }}>
              {labelScan.ingredients.length > 200
                ? labelScan.ingredients.slice(0, 200) + "…"
                : labelScan.ingredients}
            </p>
          )}
          {labelScan.allergens?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {labelScan.allergens.map((a, i) => (
                <span key={i} className="font-mono px-1.5 py-0.5 rounded-sm"
                  style={{ fontSize: 9, background: "rgba(185,28,28,0.1)", color: "#F87171", border: "1px solid rgba(185,28,28,0.2)" }}>
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
      className="flex items-center gap-2 fade-up"
      style={{
        padding: "8px 12px",
        background: "rgba(21,128,61,0.06)",
        border: "1px solid rgba(21,128,61,0.14)",
        borderRadius: 6,
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

// ─── ChatPanel (display-only — input is in the CommandBar) ───────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} fade-up`}>
      {!isUser && (
        <div className="mr-2 mt-1 shrink-0">
          <Network size={10} style={{ color: "#FAFAF7" }} strokeWidth={1.5} />
        </div>
      )}
      <div style={{
        maxWidth: "84%",
        padding: "8px 12px",
        borderRadius: isUser ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
        background: isUser ? "rgba(180,83,9,0.18)" : "rgba(255,255,255,0.06)",
        border: isUser ? "1px solid rgba(180,83,9,0.28)" : "1px solid rgba(255,255,255,0.08)",
      }}>
        <p
          className={`font-sans leading-relaxed ${!isUser && msg.streaming ? "stream-cursor" : ""}`}
          style={{ fontSize: 12, color: isUser ? "#FCE9C9" : "var(--paper-secondary)", whiteSpace: "pre-wrap" }}
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
    <div className="flex flex-col gap-2.5" style={{ borderTop: "1px solid var(--border-ink)", paddingTop: 16 }}>
      <div className="flex items-center gap-2">
        <div className="w-1 h-1 rounded-full" style={{ background: "var(--accent)" }} />
        <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 9, color: "var(--paper-tertiary)" }}>
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
  const chatMessages = useAgentStore((s) => s.chatMessages); // for scroll tracking
  const scrollRef    = useRef<HTMLDivElement>(null);
  const finalCardRef = useRef<HTMLDivElement>(null);

  // While agents are streaming or chat is active: chase the bottom
  useEffect(() => {
    if (!isRunning && !isChatting) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, isRunning, isChatting, chatMessages]);

  // When recommendation arrives: scroll to the TOP of the FinalCard so the
  // user can read from the beginning and scroll down through it naturally.
  useEffect(() => {
    if (!finalRec || isRunning) return;
    const id = setTimeout(() => {
      const card = finalCardRef.current;
      const container = scrollRef.current;
      if (!card || !container) return;
      container.scrollTo({ top: card.offsetTop - 12, behavior: "smooth" });
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
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-ink)" }}
      >
        <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 10, color: "var(--paper-tertiary)" }}>
          Stream
        </span>
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--agent-maintenance-dark)" }} />
            <span className="font-mono uppercase" style={{ fontSize: 9, color: "var(--agent-maintenance-dark)" }}>Live</span>
          </div>
        )}
        {!isRunning && scenarioName && (
          <span className="font-mono" style={{ fontSize: 10, color: "var(--paper-tertiary)" }}>
            {scenarioName.slice(0, 28)}{scenarioName.length > 28 ? "…" : ""}
          </span>
        )}
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto dark-scroll p-6 flex flex-col gap-5">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--paper-tertiary)" }} />
            <span className="font-display italic" style={{ fontSize: 15, color: "var(--paper-tertiary)" }}>
              Awaiting scenario
            </span>
            <span className="font-mono text-center" style={{ fontSize: 10, color: "var(--paper-tertiary)", opacity: 0.5, lineHeight: 1.7 }}>
              Tap an NFC card or pick a preset<br />in the command bar below
            </span>
          </div>
        )}

        {/* Label scan card — shows while scanning + after extraction */}
        {labelScan && <LabelScanCard />}

        {isRunning && <ThinkingLoader scenario={scenarioName} />}

        {entries.map((entry) => (
          <StreamCard key={entry.id} entry={entry} />
        ))}

        {finalRec && !isRunning && (
          <>
            <div ref={finalCardRef}>
              <FinalCard rec={finalRec} runCount={runCount} />
            </div>
            {/* Telegram delivery badge — appears after FinalCard */}
            <TelegramBadge />
            <SpeedComparison />
            {/* Follow-up chat history — input is in the CommandBar below */}
            <ChatPanel />
          </>
        )}
      </div>
    </div>
  );
}
