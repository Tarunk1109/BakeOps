import { create } from "zustand";
import type { TelemetryData } from "../lib/events";

export type AgentStatus = "idle" | "active" | "done" | "error";
export type ScenarioType = "maintenance" | "supply" | "recipe" | "multi" | null;

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

export interface NfcTrigger {
  scenarioId: string;
  title: string;
  timestamp: string;
  severity: string;
  impact: string;
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
  runCount: number;
  nfcTrigger: NfcTrigger | null;
  scenarioStartTime: number | null;
  activeScenarioType: ScenarioType;
  metrics: {
    oee: MetricSeries;
    waste: MetricSeries;
    energy: MetricSeries;
    totalOutput: MetricSeries;
  };
  lineMetrics: Record<string, { throughputPerHour: number; history: number[] }>;

  startEntry: (agentId: string) => void;
  appendToEntry: (agentId: string, text: string) => void;
  completeEntry: (agentId: string, output: Record<string, unknown>) => void;
  addToolCall: (agentId: string, tool: string) => void;
  setFinalRecommendation: (rec: Record<string, unknown>) => void;
  setRunning: (v: boolean) => void;
  setScenarioName: (name: string) => void;
  setNfcTrigger: (t: NfcTrigger | null) => void;
  setScenarioStartTime: (t: number | null) => void;
  setActiveScenarioType: (t: ScenarioType) => void;
  reset: () => void;
  pushTelemetry: (data: TelemetryData) => void;
}

const AGENTS: AgentMeta[] = [
  { id: "orchestrator",        name: "Orchestrator",        role: "Master coordinator",               color: "#0E0E10", status: "idle" },
  { id: "maintenance_prophet", name: "Maintenance Prophet", role: "Equipment & predictive maintenance", color: "#B45309", status: "idle" },
  { id: "supply_sentinel",     name: "Supply Sentinel",     role: "Supply chain & procurement",        color: "#1D4ED8", status: "idle" },
  { id: "recipe_chemist",      name: "Recipe Chemist",      role: "Clean-label reformulation",         color: "#6D28D9", status: "idle" },
];

function makeMetric(base: number, spread: number): MetricSeries {
  return {
    value: base,
    history: Array.from({ length: 30 }, () => base + (Math.random() - 0.5) * spread),
  };
}

function pushHistory(series: MetricSeries, val: number): MetricSeries {
  return { value: val, history: [...series.history.slice(1), val] };
}

const defaultAgents = Object.fromEntries(AGENTS.map((a) => [a.id, { ...a }]));

export const useAgentStore = create<StoreState>((set) => ({
  agents: defaultAgents,
  streamEntries: [],
  finalRecommendation: null,
  isRunning: false,
  scenarioName: "",
  runCount: 0,
  nfcTrigger: null,
  scenarioStartTime: null,
  activeScenarioType: null,
  metrics: {
    oee:         makeMetric(83.4,  4),
    waste:       makeMetric(3.1,   0.8),
    energy:      makeMetric(348,   20),
    totalOutput: makeMetric(9850,  300),
  },
  lineMetrics: {
    line_1: { throughputPerHour: 4200, history: Array.from({ length: 30 }, () => 4200 + (Math.random() - 0.5) * 150) },
    line_2: { throughputPerHour: 1800, history: Array.from({ length: 30 }, () => 1800 + (Math.random() - 0.5) * 80) },
    line_3: { throughputPerHour: 3000, history: Array.from({ length: 30 }, () => 3000 + (Math.random() - 0.5) * 100) },
    line_4: { throughputPerHour: 850,  history: Array.from({ length: 30 }, () => 850  + (Math.random() - 0.5) * 40) },
  },

  startEntry: (agentId) =>
    set((s) => ({
      agents: { ...s.agents, [agentId]: { ...s.agents[agentId], status: "active" } },
      streamEntries: [
        ...s.streamEntries,
        { id: `${agentId}-${Date.now()}`, agentId, text: "", status: "active", startTime: new Date().toISOString(), output: null, toolCalls: [] },
      ],
    })),

  appendToEntry: (agentId, text) =>
    set((s) => ({
      streamEntries: s.streamEntries.map((e) =>
        e.agentId === agentId && e.status === "active" ? { ...e, text: e.text + text } : e
      ),
    })),

  addToolCall: (agentId, tool) =>
    set((s) => ({
      streamEntries: s.streamEntries.map((e) =>
        e.agentId === agentId && e.status === "active" ? { ...e, toolCalls: [...e.toolCalls, tool] } : e
      ),
    })),

  completeEntry: (agentId, output) =>
    set((s) => ({
      agents: { ...s.agents, [agentId]: { ...s.agents[agentId], status: "done" } },
      streamEntries: s.streamEntries.map((e) =>
        e.agentId === agentId && e.status === "active" ? { ...e, status: "done", output } : e
      ),
    })),

  setFinalRecommendation: (rec) => set({ finalRecommendation: rec }),
  setRunning: (v) => set({ isRunning: v }),
  setScenarioName: (name) => set({ scenarioName: name }),
  setNfcTrigger: (t) => set({ nfcTrigger: t }),
  setScenarioStartTime: (t) => set({ scenarioStartTime: t }),
  setActiveScenarioType: (t) => set({ activeScenarioType: t }),

  reset: () =>
    set((s) => ({
      agents: Object.fromEntries(AGENTS.map((a) => [a.id, { ...a, status: "idle" as AgentStatus }])),
      streamEntries: [],
      finalRecommendation: null,
      isRunning: false,
      scenarioName: "",
      runCount: s.runCount + 1,
      nfcTrigger: null,
      scenarioStartTime: Date.now(),
      activeScenarioType: null,
    })),

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
          oee:         pushHistory(s.metrics.oee,         m.oee_pct),
          waste:       pushHistory(s.metrics.waste,       m.waste_pct),
          energy:      pushHistory(s.metrics.energy,      m.energy_kwh),
          totalOutput: pushHistory(s.metrics.totalOutput, m.total_output_per_hour),
        },
        lineMetrics: newLineMetrics,
      };
    }),
}));
