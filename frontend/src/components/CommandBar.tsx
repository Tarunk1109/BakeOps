import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Paperclip, ChevronDown, Camera, RotateCcw, MessageCircle, Mic, MicOff } from "lucide-react";
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

const GREETINGS = /^(hi|hello|hey|howdy|yo|sup|hiya|greetings|good\s*(morning|afternoon|evening)|what'?s\s*up|helo|hii+|heya|test|testing|ok|okay)[.!?\s]*$/i;

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
  const [isListening, setIsListening]   = useState(false);
  const [interimText, setInterimText]   = useState("");
  const fileRef        = useRef<HTMLInputElement>(null);
  const dropdownRef    = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const store        = useAgentStore();
  const finalRec     = useAgentStore((s) => s.finalRecommendation);
  const isChatting   = useAgentStore((s) => s.isChatting);
  const chatMessages = useAgentStore((s) => s.chatMessages);
  const scenarioName = useAgentStore((s) => s.scenarioName);

  const chatMode = !!finalRec && !store.isRunning;

  // Validation (memoized)
  const scenarioIsGreeting = useMemo(
    () => !chatMode && GREETINGS.test(text.trim()),
    [chatMode, text]
  );
  const scenarioTooShort = useMemo(
    () => !chatMode && text.trim().length > 0 && text.trim().length < 20,
    [chatMode, text]
  );
  const scenarioInvalid = scenarioTooShort || scenarioIsGreeting;

  const isDisabled = chatMode ? isChatting : store.isRunning;
  const canSubmit  = chatMode
    ? (!!text.trim() && !isChatting)
    : (!!text.trim() && !store.isRunning && !scenarioInvalid);

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

  // Stop listening when busy
  useEffect(() => {
    if ((store.isRunning || isChatting) && isListening) {
      recognitionRef.current?.stop();
    }
  }, [store.isRunning, isChatting, isListening]);

  // ── Scenario submit ────────────────────────────────────────────────────────
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

  // ── Chat submit ────────────────────────────────────────────────────────────
  const submitChat = () => {
    const q = text.trim();
    if (!q || isChatting || !finalRec) return;
    setText("");

    store.addChatMessage({ role: "user",      content: q,  timestamp: new Date().toISOString() });
    store.addChatMessage({ role: "assistant", content: "", timestamp: new Date().toISOString(), streaming: true });
    store.setIsChatting(true);

    const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));

    sendChat(
      q,
      finalRec,
      (finalRec.scenario as string) || scenarioName,
      history,
      (token) => store.appendChatToken(token),
      ()      => { store.finishChatMessage(); store.setIsChatting(false); },
      (err)   => { console.error(err); store.finishChatMessage(); store.setIsChatting(false); },
    );
  };

  // ── Voice input ────────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome or Safari."); return; }

    const recognition: SpeechRecognition = new SR();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = "en-CA";
    recognitionRef.current     = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) { setText((prev) => (prev + " " + final).trim()); setInterimText(""); }
      else { setInterimText(interim); }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "no-speech" && e.error !== "aborted") console.warn("Speech error:", e.error);
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => { setIsListening(false); setInterimText(""); };
    recognition.start();
  };

  // ── Unified Enter handler ──────────────────────────────────────────────────
  const handleEnter = () => {
    if (!canSubmit) return;
    if (chatMode) { submitChat(); return; }
    const file = fileRef.current?.files?.[0];
    if (showUpload && file) submitScenario(text, file);
    else submitScenario(text);
  };

  // ── Webcam scan ────────────────────────────────────────────────────────────
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
    inputRef.current?.focus();
  };

  const resetForNewScenario = () => {
    store.reset();
    setText("");
    setActivePreset(null);
    setShowUpload(false);
    inputRef.current?.focus();
  };

  // ── Hint text ──────────────────────────────────────────────────────────────
  const hintText = useMemo(() => {
    if (isListening) return "🎙 Listening — speak the scenario, then click the mic to stop";
    if (chatMode) return "Chat mode · full context aware · 'New scenario' to reset";
    if (scenarioIsGreeting) return "⚠ That looks like a greeting — describe an actual factory problem";
    if (scenarioTooShort && text.trim().length > 0) return `Scenario too short (${text.trim().length}/20 chars) — pick a preset or describe the issue`;
    return "Tap NFC · 🎙 voice · scan label · or pick a preset →";
  }, [isListening, chatMode, scenarioIsGreeting, scenarioTooShort, text]);

  const hintColor = scenarioIsGreeting
    ? "#F59E0B"
    : scenarioTooShort && text.trim().length > 0
    ? "var(--ink-muted)"
    : chatMode
    ? "rgba(255,255,255,0.25)"
    : "var(--ink-muted)";

  return (
    <>
      <WebcamScanner isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={handleScan} />

      <div
        style={{
          background: chatMode ? "var(--bg-ink-soft)" : "var(--bg-paper-warm)",
          borderTop: chatMode ? "1px solid var(--border-ink)" : "1px solid var(--border-hairline)",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        {/* Main bar */}
        <div className="flex items-center px-5 gap-3" style={{ height: 56 }}>
          {/* Mode icon */}
          {chatMode ? (
            <MessageCircle size={14} strokeWidth={1.5} style={{ color: "var(--accent)", flexShrink: 0 }} />
          ) : (
            <span className="font-mono" style={{ fontSize: 16, color: "var(--ink-muted)", flexShrink: 0, lineHeight: 1 }}>⌘</span>
          )}

          {/* Text input */}
          <div className="flex-1 relative flex items-center min-w-0">
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent border-none outline-none font-sans"
              style={{
                fontSize: 14,
                color: chatMode ? "var(--paper-primary)" : "var(--ink-primary)",
                caretColor: "var(--accent)",
                letterSpacing: "-0.005em",
                ...(isListening ? {
                  background: chatMode ? "rgba(180,83,9,0.06)" : "rgba(180,83,9,0.04)",
                  borderRadius: 6,
                  padding: "2px 8px",
                } : {}),
              }}
              placeholder={
                isListening ? "Listening… speak your scenario"
                : chatMode   ? "Ask a follow-up question…"
                : "Describe a factory scenario…"
              }
              value={text}
              onChange={(e) => { if (!isListening) setText(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnter(); } }}
              disabled={isDisabled}
            />
            {/* Interim speech ghost text */}
            {isListening && interimText && (
              <span
                className="absolute font-sans pointer-events-none"
                style={{
                  left: 8, right: 8,
                  fontSize: 14,
                  color: chatMode ? "rgba(250,250,247,0.4)" : "rgba(14,14,16,0.3)",
                  overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                }}
              >
                {text ? text + " " : ""}{interimText}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Chat mode: Reset */}
            {chatMode && (
              <button
                onClick={resetForNewScenario}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-sans"
                title="Start a new scenario"
                style={{
                  fontSize: 12,
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "var(--paper-tertiary)",
                  background: "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <RotateCcw size={10} strokeWidth={1.5} />
                New
              </button>
            )}

            {/* Scenario mode controls */}
            {!chatMode && (
              <>
                {showUpload && (
                  <label
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded cursor-pointer font-sans"
                    style={{ fontSize: 12, border: "1px solid var(--border-soft)", color: "var(--ink-tertiary)", background: "var(--bg-paper)", whiteSpace: "nowrap" }}
                  >
                    <Paperclip size={11} strokeWidth={1.5} />
                    {fileRef.current?.files?.[0]?.name.slice(0, 12) ?? "Upload"}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => {}} />
                  </label>
                )}

                <button
                  onClick={() => setShowScanner(true)}
                  disabled={store.isRunning}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded font-sans"
                  title="Scan product label"
                  style={{
                    fontSize: 12,
                    border: "1px solid var(--border-soft)",
                    color: store.isRunning ? "var(--ink-muted)" : "var(--ink-tertiary)",
                    background: "var(--bg-paper)",
                    cursor: store.isRunning ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Camera size={11} strokeWidth={1.5} />
                  Scan
                </button>

                {/* Preset dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setShowDropdown((s) => !s)}
                    disabled={store.isRunning}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded font-mono"
                    style={{
                      fontSize: 10,
                      border: `1px solid ${activePreset ? "rgba(180,83,9,0.35)" : "var(--border-soft)"}`,
                      color: activePreset ? "var(--accent)" : "var(--ink-tertiary)",
                      background: activePreset ? "rgba(180,83,9,0.05)" : "var(--bg-paper)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activePreset ?? "Preset"}
                    <ChevronDown size={9} strokeWidth={2} />
                  </button>

                  {showDropdown && (
                    <div
                      className="absolute bottom-full right-0 mb-2 rounded-xl overflow-hidden"
                      style={{
                        width: 268,
                        background: "var(--bg-paper)",
                        border: "1px solid var(--border-soft)",
                        boxShadow: "0 12px 32px rgba(14,14,16,0.14), 0 2px 8px rgba(14,14,16,0.06)",
                        zIndex: 100,
                      }}
                    >
                      {PRESETS.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => selectPreset(p)}
                          className="w-full text-left px-4 py-3 flex flex-col gap-1"
                          style={{
                            background: activePreset === p.id ? "rgba(180,83,9,0.04)" : "transparent",
                            borderBottom: i < PRESETS.length - 1 ? "1px solid var(--border-hairline)" : "none",
                            transition: "background 0.12s ease",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,14,16,0.03)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = activePreset === p.id ? "rgba(180,83,9,0.04)" : "transparent"; }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 8.5, color: "var(--accent)" }}>{p.label}</span>
                            <span className="font-mono" style={{ fontSize: 8.5, color: "var(--ink-muted)" }}>{p.short}</span>
                          </div>
                          <span className="font-sans font-medium" style={{ fontSize: 13, color: "var(--ink-primary)", letterSpacing: "-0.005em" }}>{p.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mic */}
            <button
              onClick={toggleVoice}
              disabled={isDisabled}
              title={isListening ? "Stop listening" : "Voice input"}
              className="flex items-center justify-center"
              style={{
                width: 30, height: 30,
                borderRadius: 8,
                border: isListening
                  ? "1px solid rgba(180,83,9,0.5)"
                  : `1px solid ${chatMode ? "rgba(255,255,255,0.09)" : "var(--border-soft)"}`,
                background: isListening ? "rgba(180,83,9,0.12)" : "transparent",
                color: isListening
                  ? "var(--accent)"
                  : chatMode ? "var(--paper-tertiary)" : "var(--ink-tertiary)",
                cursor: isDisabled ? "not-allowed" : "pointer",
                animation: isListening ? "live-pulse 1.2s ease-in-out infinite" : "none",
                flexShrink: 0,
              }}
            >
              {isListening ? <MicOff size={12} strokeWidth={1.5} /> : <Mic size={12} strokeWidth={1.5} />}
            </button>

            {/* Submit */}
            <button
              onClick={handleEnter}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans font-medium"
              style={{
                fontSize: 13,
                background: canSubmit
                  ? "var(--accent)"
                  : chatMode ? "rgba(255,255,255,0.05)" : "rgba(14,14,16,0.06)",
                color: canSubmit
                  ? "#FFFFFF"
                  : chatMode ? "var(--paper-tertiary)" : "var(--ink-muted)",
                transition: "background 0.15s ease, color 0.15s ease",
                cursor: canSubmit ? "pointer" : "default",
                whiteSpace: "nowrap",
              }}
            >
              {(store.isRunning || isChatting) ? (
                <span className="font-mono" style={{ fontSize: 13, animation: "live-pulse 1.2s ease-in-out infinite" }}>···</span>
              ) : (
                <>
                  <Send size={11} strokeWidth={2} />
                  {chatMode ? "Ask" : "Run"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hint strip */}
        <div
          className="px-5 pb-2 flex items-center"
          style={{ minHeight: 22 }}
        >
          <span
            className="font-mono"
            style={{ fontSize: 9, color: hintColor, letterSpacing: "0.02em", transition: "color 0.2s ease" }}
          >
            {hintText}
          </span>
        </div>
      </div>
    </>
  );
}
