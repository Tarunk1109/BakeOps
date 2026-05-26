import { useState } from "react";
import { triggerScenario } from "../lib/sseClient";
import { useAgentStore } from "../store/agentStore";
import type { BakeOpsEvent } from "../lib/events";

const DEMO_SCENARIO =
  "Line 3 oven temperature has dropped to 175°C — target is 180°C. Health score 0.65. Sensor reports heating element degradation.";

export default function ScenarioInput() {
  const [text, setText] = useState("");
  const store = useAgentStore();

  const handleTrigger = (scenario: string) => {
    if (!scenario.trim() || store.isRunning) return;
    store.reset();
    store.setRunning(true);

    triggerScenario(
      scenario,
      (event: BakeOpsEvent) => {
        const { event_type, agent_id, data } = event;
        switch (event_type) {
          case "agent_started":
            store.setStatus(agent_id, "active");
            break;
          case "agent_thinking":
            store.appendThinking(agent_id, data.token as string);
            break;
          case "agent_completed":
            store.setStatus(agent_id, "done");
            store.setOutput(agent_id, data as Record<string, unknown>);
            break;
          case "orchestrator_routing":
            break;
          case "final_recommendation":
            store.setRecommendation(data.recommendation as { summary: string; specialist_recommendation: Record<string, unknown> });
            break;
        }
      },
      () => store.setRunning(false),
      (err) => {
        console.error(err);
        store.setRunning(false);
      }
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <textarea
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500"
          rows={2}
          placeholder="Describe the factory scenario..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTrigger(text);
          }}
        />
        <button
          onClick={() => handleTrigger(text)}
          disabled={store.isRunning || !text.trim()}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-semibold transition-colors"
        >
          {store.isRunning ? "Running..." : "Trigger"}
        </button>
      </div>
      <button
        onClick={() => { setText(DEMO_SCENARIO); handleTrigger(DEMO_SCENARIO); }}
        disabled={store.isRunning}
        className="self-start text-xs px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700 rounded text-amber-300 transition-colors disabled:opacity-50"
      >
        ⚡ Demo: Line 3 Oven Degradation
      </button>
    </div>
  );
}
