import { useEffect, useState } from "react";
import TopStrip from "./TopStrip";
import AgentRoster from "./AgentRoster";
import ProductionLineCard from "./ProductionLineCard";
import MetricsBar from "./MetricsBar";
import ActiveStream from "./ActiveStream";
import CommandBar from "./CommandBar";
import { subscribeTelemetry } from "../lib/sseClient";
import { useAgentStore } from "../store/agentStore";

interface Equipment {
  id: string;
  type: string;
  health_score: number;
  current_temp_c?: number;
  target_temp_c?: number;
  anomaly?: string;
}

interface Line {
  id: string;
  product: string;
  status: string;
  throughput_per_hour: number;
  target_per_hour: number;
  equipment: Equipment[];
}

interface FactoryState {
  lines: Line[];
}

export default function Dashboard() {
  const [factory, setFactory] = useState<FactoryState | null>(null);
  const pushTelemetry = useAgentStore((s) => s.pushTelemetry);

  useEffect(() => {
    fetch("/api/factory_state")
      .then((r) => r.json())
      .then((d: FactoryState) => setFactory(d))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = subscribeTelemetry(pushTelemetry);
    return unsub;
  }, [pushTelemetry]);

  return (
    <div className="flex flex-col" style={{ height: "100vh", background: "var(--bg-base)" }}>
      <TopStrip />

      {/* Main 3-column grid */}
      <div className="flex flex-1 overflow-hidden">
        <AgentRoster />

        {/* Center: factory floor + metrics */}
        <main className="flex-1 flex flex-col gap-3 p-4 overflow-hidden min-w-0">
          {/* Production lines */}
          <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
            {factory
              ? factory.lines.map((line) => (
                  <ProductionLineCard key={line.id} line={line} />
                ))
              : Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-md animate-pulse"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                  />
                ))}
          </div>

          {/* Metrics bar */}
          <MetricsBar />
        </main>

        <ActiveStream />
      </div>

      <CommandBar />
    </div>
  );
}
