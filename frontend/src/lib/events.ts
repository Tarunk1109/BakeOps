export type EventType =
  | "agent_started"
  | "agent_thinking"
  | "agent_tool_call"
  | "agent_tool_result"
  | "agent_completed"
  | "orchestrator_routing"
  | "final_recommendation"
  | "stream_done";

export interface BakeOpsEvent {
  event_type: EventType;
  agent_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}
