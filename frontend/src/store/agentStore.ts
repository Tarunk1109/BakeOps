import { create } from "zustand";

export type AgentStatus = "idle" | "active" | "done" | "error";

export interface AgentState {
  status: AgentStatus;
  thinkingText: string;
  output: Record<string, unknown> | null;
}

interface Recommendation {
  summary: string;
  specialist_recommendation: Record<string, unknown>;
}

interface StoreState {
  agents: Record<string, AgentState>;
  finalRecommendation: Recommendation | null;
  isRunning: boolean;
  appendThinking: (agentId: string, token: string) => void;
  setStatus: (agentId: string, status: AgentStatus) => void;
  setOutput: (agentId: string, output: Record<string, unknown>) => void;
  setRecommendation: (rec: Recommendation) => void;
  setRunning: (v: boolean) => void;
  reset: () => void;
}

const defaultAgents: Record<string, AgentState> = {
  orchestrator: { status: "idle", thinkingText: "", output: null },
  maintenance_prophet: { status: "idle", thinkingText: "", output: null },
};

export const useAgentStore = create<StoreState>((set) => ({
  agents: { ...defaultAgents },
  finalRecommendation: null,
  isRunning: false,

  appendThinking: (agentId, token) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentId]: {
          ...s.agents[agentId],
          thinkingText: (s.agents[agentId]?.thinkingText ?? "") + token,
        },
      },
    })),

  setStatus: (agentId, status) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentId]: { ...s.agents[agentId], status },
      },
    })),

  setOutput: (agentId, output) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentId]: { ...s.agents[agentId], output },
      },
    })),

  setRecommendation: (rec) => set({ finalRecommendation: rec }),

  setRunning: (v) => set({ isRunning: v }),

  reset: () =>
    set({
      agents: structuredClone(defaultAgents),
      finalRecommendation: null,
      isRunning: false,
    }),
}));
