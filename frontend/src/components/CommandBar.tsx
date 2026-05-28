import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, ChevronDown, Camera, RotateCcw, MessageCircle } from "lucide-react";
import { triggerScenario, triggerWithImage, scanLabel, sendChat } from "../lib/sseClient";
import { useAgentStore } from "../store/agentStore";
import type { BakeOpsEvent } from "../lib/events";
import WebcamScanner from "./WebcamScanner";

const PRESETS = [
  {
    id: "SCN-1", label: "SCN-1", title: "Tunnel Oven Anomaly", short: "Line 03 · Stonefire Naan",
    text: "Tunnel oven on Line 03 (Stonefire naan production) showing thermal sensor drift. Heating element health score dropped from 0.92 to 0.61 over the past 4 hours. Current zone temperature 285°C, target 290°C. Peak production window begins in 6 hours. Costco Ontario delivery scheduled at 0500.",
  },
  {
    id: "SCN-2", label: "SCN-2", title: "Yeast Supplier Cut", short: "Lallemand · 35% Allocation",
    text: "Lallemand Inc. (commercial yeast supplier) issued emergency notice: 35% allocation reduction effective immediately due to fermentation facility incident at their Montreal plant. Currently 4 days of yeast inventory across North York and Mississauga facilities. Croissant, sourdough, and artisan loaf lines depend on this supplier. Decision required within 12 hours.",
  },
  {
    id: "SCN-3", label: "SCN-3", title: "Costco Clean Label", short: "Croissant · Q3 2026 Deadline",
    text: "Costco Canada has issued a clean label compliance request: remove calcium propionate and mono- and diglycerides from all FGF-supplied croissant SKUs by Q3 2026. Affects 6 product lines accounting for $12.4M annual revenue. Reformulation required while maintaining 21-day shelf life and existing texture profile. Provide reformulation analysis.",
    upload: true,
  },
  {
    id: "SCN-4", label: "SCN-4", title: "Stonefire Recall Risk", short: "West Coast · Mold Reports",
    text: "Customer service log: 7 retailers reporting premature mold growth on Stonefire naan products distributed through West Coast warehouse. Shelf life trending 13.4 days versus 18-day commitment. Past 48 hours: 142 customer complaints. Cross-functional investigation required.",
  },
];

function handleScenarioEvent(event: BakeOpsEvent) {
  const store = useAgentStore.getState();
  switch (event.event_type) {
    case "agent_started":        store.startEntry(event.agent_id); break;
    case "agent_thinking":       store.appendToEntry(event.agent_id, (event.data.token as string) ?? ""); break;
    case "agent_tool_call":      store.addToolCall(event.agent_id, (event.data.tool as string) ?? "tool"); break;
    case "agent_completed":      store.completeEntry(event.agent_id, event.data as Record<string, unknown>); break;
    case "final_recommendation": store.setFinalRecommendation(event.data.recommendation as Record<string, unknown>); break;
    case "alert_sent":
      store.setAlertSent({
        channel:   (event.data.channel   as string) ?? "telegram",
        status:    (event.data.status    as string) ?? "delivered",
        timestamp: (event.data.timestamp as string) ?? new Date().toISOString(),
      });
      break;
    case "label_scan_started":
      store.setLabelScan({ scanning: true, product_name: "", brand: "", ingredients: "", allergens: [], capturedAt: new Date().toISOString() });
      break;
    case "label_scan_result":
      store.setLabelScan({
        scanning: false,
        product_name: (event.data.product_name as string) ?? "Unknown",
        brand:        (event.data.brand        as string) ?? "Unknown",
        ingredients:  (event.data.ingredients  as string) ?? "",
        allergens:    (event.data.allergens    as string[]) ?? [],
        capturedAt:   new Date().toISOString(),
      });
      break;
  }
}

export default function CommandBar() {
  const [text, setText]                 = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showUpload, setShowUpload]     = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showScanner, setShowScanner]   = useState(false);
  const fileRef     = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  const store       = useAgentStore();
  const finalRec    = useAgentStore((s) => s.finalRecommendation);
  const isChatting  = useAgentStore((s) => s.isChatting);
  const chatMessages = useAgentStore((s) => s.chatMessages);
  const scenarioName = useAgentStore((s) => s.scenarioName);

  // ── Mode ──────────────────────────────────────────────────────────────────
  // Chat mode when a recommendation is on screen and agents aren't running
  const chatMode = !!finalRec && !store.isRunning;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Scenario submit ───────────────────────────────────────────────────────
  const submitScenario = (scenario: string, file?: File) => {
    if (!scenario.trim() || store.isRunning) return;
    store.reset();
    store.setRunning(true);
    store.setScenarioName(scenario.slice(0, 60) + (scenario.length > 60 ? "…" : ""));
    store.setScenarioStartTime(Date.now());
    const onError = (err: Error) => { console.error(err); store.setRunning(false); };
    const onDone  = () => store.setRunning(false);
    if (file) triggerWithImage(scenario, file, handleScenarioEvent, onDone, onError);
    else      triggerScenario(scenario, handleScenarioEvent, onDone, onError);
  };

  // ── Chat submit ───────────────────────────────────────────────────────────
  const submitChat = () => {
    const q = text.trim();
    if (!q || isChatting || !finalRec) return;
    setText("");

    const addMsg      = store.addChatMessage;
    const appendToken = store.appendChatToken;
    const finishMsg   = store.finishChatMessage;
    const setChat     = store.setIsChatting;

    addMsg({ role: "user",      content: q,  timestamp: new Date().toISOString() });
    addMsg({ role: "assistant", content: "", timestamp: new Date().toISOString(), streaming: true });
    setChat(true);

    const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));

    sendChat(
      q,
      finalRec,
      (finalRec.scenario as string) || scenarioName,
      history,
      (token) => appendToken(token),
      ()      => { finishMsg(); setChat(false); },
      (err)   => { console.error(err); finishMsg(); setChat(false); },
    );
  };

  // ── Unified Enter handler ─────────────────────────────────────────────────
  const handleEnter = () => {
    if (chatMode) submitChat();
    else {
      const file = fileRef.current?.files?.[0];
      if (showUpload && file) submitScenario(text, file);
      else submitScenario(text);
    }
  };

  // ── Webcam scan ───────────────────────────────────────────────────────────
  const handleScan = (base64: string) => {
    if (store.isRunning) return;
    store.reset();
    store.setRunning(true);
    store.setScenarioName("Live Label Scan");
    store.setScenarioStartTime(Date.now());
    const onError = (err: Error) => { console.error(err); store.setRunning(false); };
    const onDone  = () => store.setRunning(false);
    scanLabel(base64, handleScenarioEvent, onDone, onError);
  };

  const selectPreset = (preset: (typeof PRESETS)[0]) => {
    setActivePreset(preset.id);
    setText(preset.text);
    setShowUpload(!!preset.upload);
    setShowDropdown(false);
  };

  const resetForNewScenario = () => {
    store.reset();
    setText("");
    setActivePreset(null);
    setShowUpload(false);
    inputRef.current?.focus();
  };

  // ── Scenario validation ───────────────────────────────────────────────────
  const GREETINGS = /^(hi|hello|hey|howdy|yo|sup|hiya|greetings|good\s*(morning|afternoon|evening)|what'?s\s*up|helo|hii+|heya|test|testing|ok|okay)[.!?\s]*$/i;
  const scenarioTooShort = !chatMode && text.trim().length < 20;
  const scenarioIsGreeting = !chatMode && GREETINGS.test(text.trim());
  const scenarioInvalid = scenarioTooShort || scenarioIsGreeting;

  const isDisabled = chatMode ? isChatting : store.isRunning;
  const canSubmit  = chatMode
    ? (!!text.trim() && !isChatting)
    : (!!text.trim() && !store.isRunning && !scenarioInvalid);

  return (
    <>
      <WebcamScanner isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={handleScan} />

      <div
        className="flex items-center px-6 gap-3 shrink-0 relative"
        style={{
          height: 64,
          background: chatMode ? "var(--bg-ink-soft)" : "var(--bg-paper-warm)",
          borderTop: chatMode
            ? "1px solid var(--border-ink)"
            : "1px solid var(--border-hairline)",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        {/* Mode indicator */}
        {chatMode ? (
          <MessageCircle size={14} strokeWidth={1.5} style={{ color: "var(--accent)", flexShrink: 0 }} />
        ) : (
          <span className="font-mono" style={{ fontSize: 14, color: "var(--ink-muted)", flexShrink: 0 }}>⌘</span>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent border-none outline-none font-sans"
          style={{
            fontSize: 14,
            color: chatMode ? "var(--paper-primary)" : "var(--ink-primary)",
            caretColor: "var(--accent)",
          }}
          placeholder={
            chatMode
              ? "Ask a follow-up about this recommendation…"
              : "Trigger scenario or describe a factory event…"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnter(); } }}
          disabled={isDisabled}
        />

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Chat mode: Reset button */}
          {chatMode && (
            <button
              onClick={resetForNewScenario}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded font-sans"
              title="Start a new scenario"
              style={{
                fontSize: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--paper-tertiary)",
                background: "transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <RotateCcw size={11} strokeWidth={1.5} />
              New scenario
            </button>
          )}

          {/* Scenario mode controls */}
          {!chatMode && (
            <>
              {showUpload && (
                <label
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer font-sans"
                  style={{ fontSize: 13, border: "1px solid var(--border-soft)", color: "var(--ink-tertiary)", background: "var(--bg-paper)" }}
                >
                  <Paperclip size={12} strokeWidth={1.5} />
                  {fileRef.current?.files?.[0]?.name.slice(0, 14) ?? "Upload Label"}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => {}} />
                </label>
              )}

              <button
                onClick={() => setShowScanner(true)}
                disabled={store.isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded font-sans"
                title="Scan product label with webcam"
                style={{
                  fontSize: 13,
                  border: "1px solid var(--border-soft)",
                  color: store.isRunning ? "var(--ink-muted)" : "var(--ink-tertiary)",
                  background: "var(--bg-paper)",
                  cursor: store.isRunning ? "not-allowed" : "pointer",
                }}
              >
                <Camera size={12} strokeWidth={1.5} />
                Scan Label
              </button>

              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setShowDropdown((s) => !s)}
                  disabled={store.isRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono"
                  style={{
                    fontSize: 11,
                    border: "1px solid var(--border-soft)",
                    color: activePreset ? "var(--accent)" : "var(--ink-tertiary)",
                    background: activePreset ? "var(--accent-soft)" : "var(--bg-paper)",
                  }}
                >
                  {activePreset ?? "SCN"}
                  <ChevronDown size={10} strokeWidth={2} />
                </button>

                {showDropdown && (
                  <div
                    className="absolute bottom-full right-0 mb-2 rounded-lg overflow-hidden"
                    style={{ width: 260, background: "var(--bg-paper)", border: "1px solid var(--border-soft)", boxShadow: "0 8px 24px rgba(14,14,16,0.12)", zIndex: 100 }}
                  >
                    {PRESETS.map((p) => (
                      <button key={p.id} onClick={() => selectPreset(p)}
                        className="w-full text-left px-4 py-3 flex flex-col gap-0.5"
                        style={{ background: activePreset === p.id ? "var(--accent-soft)" : "transparent", borderBottom: "1px solid var(--border-hairline)" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono uppercase tracking-wider" style={{ fontSize: 9, color: "var(--accent)" }}>{p.label}</span>
                          <span className="font-mono" style={{ fontSize: 9, color: "var(--ink-muted)" }}>{p.short}</span>
                        </div>
                        <span className="font-sans font-medium" style={{ fontSize: 13, color: "var(--ink-primary)" }}>{p.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit / Send */}
          <button
            onClick={handleEnter}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded font-sans font-medium"
            style={{
              fontSize: 13,
              background: canSubmit ? "var(--accent)" : (chatMode ? "rgba(255,255,255,0.06)" : "var(--border-soft)"),
              color: canSubmit ? "#FFFFFF" : (chatMode ? "var(--paper-tertiary)" : "var(--ink-muted)"),
              transition: "background 0.15s",
            }}
          >
            {(store.isRunning || isChatting) ? (
              <span className="pulse-dot font-mono" style={{ fontSize: 13 }}>···</span>
            ) : (
              <><Send size={12} strokeWidth={2} />{chatMode ? "Ask" : "Send"}</>
            )}
          </button>
        </div>

        {/* Bottom hint */}
        <span
          className="absolute font-mono"
          style={{ fontSize: 9, bottom: 7, right: 24, pointerEvents: "none",
            color: scenarioIsGreeting ? "var(--status-warning)" : scenarioTooShort && text.trim().length > 0 ? "var(--ink-muted)" : chatMode ? "rgba(255,255,255,0.2)" : "var(--ink-muted)"
          }}
        >
          {chatMode
            ? "Chat mode · knows the full recommendation · click 'New scenario' to reset"
            : scenarioIsGreeting
            ? "That looks like a greeting — describe an actual factory scenario to trigger agents"
            : scenarioTooShort && text.trim().length > 0
            ? `Scenario too short (${text.trim().length}/20 chars min) — pick a preset or describe the problem`
            : "Tap NFC · scan label · or pick a preset above"}
        </span>
      </div>
    </>
  );
}
