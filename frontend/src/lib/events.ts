export type EventType =
  | "agent_started"
  | "agent_thinking"
  | "agent_tool_call"
  | "agent_tool_result"
  | "agent_completed"
  | "orchestrator_routing"
  | "final_recommendation"
  | "telemetry_update"
  | "scenario_trigger"
  | "stream_done"
  | "alert_sent"
  | "label_scan_started"
  | "label_scan_result";

export interface BakeOpsEvent {
  event_type: EventType;
  agent_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface TelemetryData {
  lines: Record<string, { throughput_per_hour: number; status: string }>;
  metrics: {
    oee_pct: number;
    waste_pct: number;
    energy_kwh: number;
    total_output_per_hour: number;
  };
}
