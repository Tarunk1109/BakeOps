import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, ChevronDown, Camera } from "lucide-react";
import { triggerScenario, triggerWithImage, scanLabel } from "../lib/sseClient";
import { useAgentStore } from "../store/agentStore";
import type { BakeOpsEvent } from "../lib/events";
import WebcamScanner from "./WebcamScanner";

const PRESETS = [
  {
    id: "SCN-1",
    label: "SCN-1",
    title: "Tunnel Oven Anomaly",
    short: "Line 03 · Stonefire Naan",
    text: "Tunnel oven on Line 03 (Stonefire naan production) showing thermal sensor drift. Heating element health score dropped from 0.92 to 0.61 over the past 4 hours. Current zone temperature 285°C, target 290°C. Peak production window begins in 6 hours. Costco Ontario delivery scheduled at 0500.",
  },
  {
    id: "SCN-2",
    label: "SCN-2",
    title: "Yeast Supplier Cut",
    short: "Lallemand · 35% Allocation",
    text: "Lallemand Inc. (commercial yeast supplier) issued emergency notice: 35% allocation reduction effective immediately due to fermentation facility incident at their Montreal plant. Currently 4 days of yeast inventory across North York and Mississauga facilities. Croissant, sourdough, and artisan loaf lines depend on this supplier. Decision required within 12 hours.",
  },
  {
    id: "SCN-3",
    label: "SCN-3",
    title: "Costco Clean Label",
    short: "Croissant · Q3 2026 Deadline",
    text: "Costco Canada has issued a clean label compliance request: remove calcium propionate and mono- and diglycerides from all FGF-supplied croissant SKUs by Q3 2026. Affects 6 product lines accounting for $12.4M annual revenue. Reformulation required while maintaining 21-day shelf life and existing texture profile. Provide reformulation analysis.",
    upload: true,
  },
  {
    id: "SCN-4",
    label: "SCN-4",
    title: "Stonefire Recall Risk",
    short: "West Coast · Mold Reports",
    text: "Customer service log: 7 retailers reporting premature mold growth on Stonefire naan products distributed through West Coast warehouse. Shelf life trending 13.4 days versus 18-day commitment. Past 48 hours: 142 customer complaints. Cross-functional investigation required.",
  },
];

function handleEvent(event: BakeOpsEvent) {
  const store = useAgentStore.getState();
  switch (event.event_type) {
    case "agent_started":
      store.startEntry(event.agent_id);
      break;
    case "agent_thinking":
      store.appendToEntry(event.agent_id, (event.data.token as string) ?? "");
      break;
    case "agent_tool_call":
      store.addToolCall(event.agent_id, (event.data.tool as string) ?? "tool");
      break;
    case "agent_completed":
      store.completeEntry(event.agent_id, event.data as Record<string, unknown>);
      break;
    case "final_recommendation":
      store.setFinalRecommendation(event.data.recommendation as Record<string, unknown>);
      break;
    case "alert_sent":
      store.setAlertSent({
        channel:   (event.data.channel  as string) ?? "telegram",
        status:    (event.data.status   as string) ?? "delivered",
        timestamp: (event.data.timestamp as string) ?? new Date().toISOString(),
      });
      break;
    case "label_scan_started":
      store.setLabelScan({
        scanning:    true,
        product_name: "",
        brand:        "",
        ingredients:  "",
        allergens:    [],
        capturedAt:   new Date().toISOString(),
      });
      break;
    case "label_scan_result":
      store.setLabelScan({
        scanning:     false,
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
  const [text, setText]               = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showUpload, setShowUpload]    = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showScanner, setShowScanner]  = useState(false);
  const fileRef     = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const store       = useAgentStore();

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

  const submit = (scenario: string, file?: File) => {
    if (!scenario.trim() || store.isRunning) return;
    store.reset();
    store.setRunning(true);
    store.setScenarioName(scenario.slice(0, 60) + (scenario.length > 60 ? "…" : ""));
    store.setScenarioStartTime(Date.now());
    const onError = (err: Error) => { console.error(err); store.setRunning(false); };
    const onDone  = () => store.setRunning(false);
    if (file) {
      triggerWithImage(scenario, file, handleEvent, onDone, onError);
    } else {
      triggerScenario(scenario, handleEvent, onDone, onError);
    }
  };

  // Webcam scan callback — fires after frame is captured
  const handleScan = (base64: string) => {
    if (store.isRunning) return;
    store.reset();
    store.setRunning(true);
    store.setScenarioName("Live Label Scan");
    store.setScenarioStartTime(Date.now());
    const onError = (err: Error) => { console.error(err); store.setRunning(false); };
    const onDone  = () => store.setRunning(false);
    scanLabel(base64, handleEvent, onDone, onError);
  };

  const selectPreset = (preset: (typeof PRESETS)[0]) => {
    setActivePreset(preset.id);
    setText(preset.text);
    setShowUpload(!!preset.upload);
    setShowDropdown(false);
  };

  const handleFileSubmit = () => {
    const file = fileRef.current?.files?.[0];
    if (showUpload && file) submit(text, file);
    else submit(text);
  };

  return (
    <>
      {/* Webcam scanner modal */}
      <WebcamScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />

      <div
        className="flex items-center px-6 gap-4 shrink-0 relative"
        style={{
          height: 64,
          background: "var(--bg-paper-warm)",
          borderTop: "1px solid var(--border-hairline)",
        }}
      >
        {/* ⌘ prompt */}
        <span className="font-mono" style={{ fontSize: 14, color: "var(--ink-muted)", flexShrink: 0 }}>⌘</span>

        {/* Input */}
        <input
          type="text"
          className="flex-1 bg-transparent border-none outline-none font-sans"
          style={{
            fontSize: 15,
            color: "var(--ink-primary)",
            caretColor: "var(--accent)",
          }}
          placeholder="Trigger scenario or describe a factory event…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleFileSubmit(); }
          }}
          disabled={store.isRunning}
        />

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Upload (SCN-3) */}
          {showUpload && (
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer font-sans"
              style={{
                fontSize: 13,
                border: "1px solid var(--border-soft)",
                color: "var(--ink-tertiary)",
                background: "var(--bg-paper)",
              }}
              title="Upload product label image"
            >
              <Paperclip size={12} strokeWidth={1.5} />
              {fileRef.current?.files?.[0]?.name.slice(0, 14) ?? "Upload Label"}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => {}} />
            </label>
          )}

          {/* Webcam scan button */}
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
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!store.isRunning) {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(180,83,9,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-tertiary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-soft)";
            }}
          >
            <Camera size={12} strokeWidth={1.5} />
            <span>Scan Label</span>
          </button>

          {/* Scenario dropdown */}
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
                style={{
                  width: 260,
                  background: "var(--bg-paper)",
                  border: "1px solid var(--border-soft)",
                  boxShadow: "0 8px 24px rgba(14,14,16,0.12)",
                  zIndex: 100,
                }}
              >
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPreset(p)}
                    className="w-full text-left px-4 py-3 flex flex-col gap-0.5"
                    style={{
                      background: activePreset === p.id ? "var(--accent-soft)" : "transparent",
                      borderBottom: "1px solid var(--border-hairline)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono uppercase tracking-wider" style={{ fontSize: 9, color: "var(--accent)" }}>
                        {p.label}
                      </span>
                      <span className="font-mono" style={{ fontSize: 9, color: "var(--ink-muted)" }}>{p.short}</span>
                    </div>
                    <span className="font-sans font-medium" style={{ fontSize: 13, color: "var(--ink-primary)" }}>
                      {p.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleFileSubmit}
            disabled={store.isRunning || !text.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded font-sans font-medium"
            style={{
              fontSize: 13,
              background: store.isRunning || !text.trim() ? "var(--border-soft)" : "var(--accent)",
              color: store.isRunning || !text.trim() ? "var(--ink-muted)" : "#FFFFFF",
              transition: "background 0.15s",
            }}
          >
            {store.isRunning ? (
              <span className="pulse-dot font-mono" style={{ fontSize: 13 }}>···</span>
            ) : (
              <><Send size={12} strokeWidth={2} />Send</>
            )}
          </button>
        </div>

        {/* Hint */}
        <span
          className="absolute right-6 font-mono"
          style={{ fontSize: 9, color: "var(--ink-muted)", bottom: 7, pointerEvents: "none" }}
        >
          Tap NFC · scan label · or pick a preset above
        </span>
      </div>
    </>
  );
}
