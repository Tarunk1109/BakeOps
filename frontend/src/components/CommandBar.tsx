import { useState, useRef } from "react";
import { Send, Paperclip, ChevronRight } from "lucide-react";
import { triggerScenario, triggerWithImage } from "../lib/sseClient";
import { useAgentStore } from "../store/agentStore";
import type { BakeOpsEvent } from "../lib/events";

const PRESETS = [
  {
    id: "SCN-1",
    label: "SCN-1",
    title: "Oven Degradation",
    text: "Line 3 oven temperature has dropped to 175°C — target is 180°C. Health score 0.65. Sensor reports heating element degradation. Assess failure risk and recommend action.",
  },
  {
    id: "SCN-2",
    label: "SCN-2",
    title: "Wheat Shortage",
    text: "Major wheat supplier facility fire reported in Saskatchewan. We source Grade A bread flour from that region. Current inventory is approximately 4 days. Assess supply chain risk and identify alternatives.",
  },
  {
    id: "SCN-3",
    label: "SCN-3",
    title: "Clean Label",
    text: "Analyze the uploaded croissant product label and reformulate all synthetic ingredients for clean-label CFIA compliance.",
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
  }
}

export default function CommandBar() {
  const [text, setText] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const store = useAgentStore();

  const submit = (scenario: string, file?: File) => {
    if (!scenario.trim() || store.isRunning) return;
    store.reset();
    store.setRunning(true);
    store.setScenarioName(scenario.slice(0, 50) + (scenario.length > 50 ? "…" : ""));

    const onError = (err: Error) => {
      console.error(err);
      store.setRunning(false);
    };
    const onDone = () => store.setRunning(false);

    if (file) {
      triggerWithImage(scenario, file, handleEvent, onDone, onError);
    } else {
      triggerScenario(scenario, handleEvent, onDone, onError);
    }
  };

  const selectPreset = (preset: (typeof PRESETS)[0]) => {
    setActivePreset(preset.id);
    setText(preset.text);
    setShowUpload(preset.id === "SCN-3");
  };

  const handleFileSubmit = () => {
    const file = fileRef.current?.files?.[0];
    if (showUpload && file) {
      submit(text, file);
    } else {
      submit(text);
    }
  };

  return (
    <div
      className="border-t flex items-center px-4 gap-3 shrink-0"
      style={{ height: 56, borderColor: "var(--border-default)", background: "var(--bg-base)" }}
    >
      {/* Prompt character */}
      <ChevronRight size={14} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0 }} />

      {/* Input */}
      <input
        type="text"
        className="flex-1 bg-transparent border-none outline-none font-mono text-[13px] placeholder:text-[var(--text-muted)]"
        style={{ color: "var(--text-primary)", caretColor: "var(--accent)" }}
        placeholder="Trigger scenario or describe a factory event..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleFileSubmit();
          }
        }}
        disabled={store.isRunning}
      />

      {/* File upload (for SCN-3) */}
      {showUpload && (
        <label
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm cursor-pointer"
          style={{
            border: "1px solid var(--border-default)",
            color: "var(--text-tertiary)",
            background: "var(--bg-surface)",
          }}
          title="Upload product label image"
        >
          <Paperclip size={12} strokeWidth={1.5} />
          <span className="font-mono text-[10px]">
            {fileRef.current?.files?.[0]?.name.slice(0, 16) ?? "Upload label"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={() => {}}
          />
        </label>
      )}

      {/* Preset buttons */}
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => selectPreset(p)}
            disabled={store.isRunning}
            title={p.title}
            className="px-2 py-1 rounded-sm font-mono text-[10px] uppercase transition-colors"
            style={{
              border: `1px solid ${activePreset === p.id ? "var(--accent)" : "var(--border-default)"}`,
              color: activePreset === p.id ? "var(--accent)" : "var(--text-muted)",
              background: activePreset === p.id ? "var(--accent-dim)" : "transparent",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={handleFileSubmit}
        disabled={store.isRunning || !text.trim()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-[11px] font-medium transition-colors"
        style={{
          background: store.isRunning || !text.trim() ? "var(--bg-elevated)" : "var(--accent)",
          color: store.isRunning || !text.trim() ? "var(--text-muted)" : "#0A0A0B",
        }}
      >
        {store.isRunning ? (
          <span className="pulse-dot">···</span>
        ) : (
          <>
            <Send size={11} strokeWidth={2} />
            Submit
          </>
        )}
      </button>
    </div>
  );
}
