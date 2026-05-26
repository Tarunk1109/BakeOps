import { create } from "zustand";
import type { TelemetryData } from "../lib/events";

export type AgentStatus = "idle" | "active" | "done" | "error";

export interface AgentMeta {
  id: string;
  name: string;
  role: string;
  color: string;
  status: AgentStatus;
}

export interface StreamEntry {
  id: string;
  agentId: string;
  text: string;
  status: AgentStatus;
  startTime: string;
  output: Record<string, unknown> | null;
  toolCalls: string[];
}

interface MetricSeries {
  value: number;
  history: number[];
}

interface StoreState {
  agents: Record<string, AgentMeta>;
  streamEntries: StreamEntry[];
  finalRecommendation: Record<string, unknown> | null;
  isRunning: boolean;
  scenarioName: string;
  metrics: {
    oee: MetricSeries;
    waste: MetricSeries;
    energy: MetricSeries;
    totalOutput: MetricSeries;
  };
  lineMetrics: Record<string, { throughputPerHour: number; history: number[] }>;

  // scenario actions
  startEntry: (agentId: string) => void;
  appendToEntry: (agentId: string, text: string) => void;
  completeEntry: (agentId: string, output: Record<string, unknown>) => void;
  addToolCall: (agentId: string, tool: string) => void;
  setFinalRecommendation: (rec: Record<string, unknown>) => void;
  setRunning: (v: boolean) => void;
  setScenarioName: (name: string) => void;
  reset: () => void;

  // telemetry
  pushTelemetry: (data: TelemetryData) => void;
}

const AGENTS: AgentMeta[] = [
  { id: "orchestrator", name: "Orchestrator", role: "Master coordinator", color: "#FAFAFA", status: "idle" },
  { id: "maintenance_prophet", name: "Maintenance Prophet", role: "Equipment & predictive maintenance", color: "#F59E0B", status: "idle" },
  { id: "supply_sentinel", name: "Supply Sentinel", role: "Supply chain & procurement", color: "#3B82F6", status: "idle" },
  { id: "recipe_chemist", name: "Recipe Chemist", role: "Clean-label reformulation", color: "#A78BFA", status: "idle" },
];

function makeMetric(base: number, spread: number): MetricSeries {
  return {
    value: base,
    history: Array.from({ length: 30 }, () => base + (Math.random() - 0.5) * spread),
  };
}

function pushHistory(series: MetricSeries, val: number): MetricSeries {
  const history = [...series.history.slice(1), val];
  return { value: val, history };
}

const defaultAgents = Object.fromEntries(AGENTS.map((a) => [a.id, { ...a }]));

export const useAgentStore = create<StoreState>((set) => ({
  agents: defaultAgents,
  streamEntries: [],
  finalRecommendation: null,
  isRunning: false,
  scenarioName: "",
  metrics: {
    oee: makeMetric(83.4, 4),
    waste: makeMetric(3.1, 0.8),
    energy: makeMetric(348, 20),
    totalOutput: makeMetric(9850, 300),
  },
  lineMetrics: {
    line_1: { throughputPerHour: 4200, history: Array.from({ length: 30 }, () => 4200 + (Math.random() - 0.5) * 150) },
    line_2: { throughputPerHour: 1800, history: Array.from({ length: 30 }, () => 1800 + (Math.random() - 0.5) * 80) },
    line_3: { throughputPerHour: 3000, history: Array.from({ length: 30 }, () => 3000 + (Math.random() - 0.5) * 100) },
    line_4: { throughputPerHour: 850, history: Array.from({ length: 30 }, () => 850 + (Math.random() - 0.5) * 40) },
  },

  startEntry: (agentId) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentId]: { ...s.agents[agentId], status: "active" },
      },
      streamEntries: [
        ...s.streamEntries,
        { id: `${agentId}-${Date.now()}`, agentId, text: "", status: "active", startTime: new Date().toISOString(), output: null, toolCalls: [] },
      ],
    })),

  appendToEntry: (agentId, text) =>
    set((s) => {
      const entries = s.streamEntries.map((e) => {
        if (e.agentId === agentId && e.status === "active") {
          return { ...e, text: e.text + text };
        }
        return e;
      });
      return { streamEntries: entries };
    }),

  addToolCall: (agentId, tool) =>
    set((s) => {
      const entries = s.streamEntries.map((e) => {
        if (e.agentId === agentId && e.status === "active") {
          return { ...e, toolCalls: [...e.toolCalls, tool] };
        }
        return e;
      });
      return { streamEntries: entries };
    }),

  completeEntry: (agentId, output) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentId]: { ...s.agents[agentId], status: "done" },
      },
      streamEntries: s.streamEntries.map((e) => {
        if (e.agentId === agentId && e.status === "active") {
          return { ...e, status: "done", output };
        }
        return e;
      }),
    })),

  setFinalRecommendation: (rec) => set({ finalRecommendation: rec }),

  setRunning: (v) => set({ isRunning: v }),

  setScenarioName: (name) => set({ scenarioName: name }),

  reset: () =>
    set({
      agents: Object.fromEntries(AGENTS.map((a) => [a.id, { ...a, status: "idle" as AgentStatus }])),
      streamEntries: [],
      finalRecommendation: null,
      isRunning: false,
      scenarioName: "",
    }),

  pushTelemetry: (data) =>
    set((s) => {
      const m = data.metrics;
      const newLineMetrics = { ...s.lineMetrics };
      for (const [id, val] of Object.entries(data.lines)) {
        const prev = s.lineMetrics[id];
        if (prev) {
          newLineMetrics[id] = {
            throughputPerHour: val.throughput_per_hour,
            history: [...prev.history.slice(1), val.throughput_per_hour],
          };
        }
      }
      return {
        metrics: {
          oee: pushHistory(s.metrics.oee, m.oee_pct),
          waste: pushHistory(s.metrics.waste, m.waste_pct),
          energy: pushHistory(s.metrics.energy, m.energy_kwh),
          totalOutput: pushHistory(s.metrics.totalOutput, m.total_output_per_hour),
        },
        lineMetrics: newLineMetrics,
      };
    }),
}));
