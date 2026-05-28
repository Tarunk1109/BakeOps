import type { BakeOpsEvent, TelemetryData } from "./events";

export async function scanLabel(
  imageBase64: string,
  onEvent: (event: BakeOpsEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    const response = await fetch("/api/scan-label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await _readSSEStream(response.body, onEvent, onDone);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function triggerScenario(
  scenario: string,
  onEvent: (event: BakeOpsEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    const response = await fetch("/api/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await _readSSEStream(response.body, onEvent, onDone);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function triggerWithImage(
  scenario: string,
  file: File,
  onEvent: (event: BakeOpsEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("scenario", scenario);
    const response = await fetch("/api/upload_label", { method: "POST", body: form });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await _readSSEStream(response.body, onEvent, onDone);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

async function _readSSEStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: BakeOpsEvent) => void,
  onDone: () => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const event = JSON.parse(raw) as BakeOpsEvent;
        if (event.event_type === "stream_done") { onDone(); return; }
        onEvent(event);
      } catch { /* skip malformed */ }
    }
  }
  onDone();
}

export function subscribeTelemetry(onData: (data: TelemetryData) => void): () => void {
  let es: EventSource | null = null;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    if (closed) return;
    es = new EventSource("/api/telemetry");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as BakeOpsEvent;
        if (event.event_type === "telemetry_update") {
          onData(event.data as unknown as TelemetryData);
        }
      } catch { /* skip */ }
    };
    es.onerror = () => {
      es?.close();
      es = null;
      if (!closed) retryTimer = setTimeout(connect, 2000);
    };
  }

  connect();
  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    es?.close();
  };
}

export function subscribeToTriggers(
  onTrigger: (scenarioId: string, scenarioText: string) => void
): () => void {
  let es: EventSource | null = null;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    if (closed) return;
    console.log("[BakeOps] /api/events connecting…");
    es = new EventSource("/api/events");

    es.onopen = () => {
      console.log("[BakeOps] /api/events connected ✓");
    };

    es.onmessage = (e) => {
      // Ignore keepalive comments (they arrive as empty data)
      if (!e.data || e.data.trim() === "") return;
      try {
        const event = JSON.parse(e.data) as BakeOpsEvent;
        if (event.event_type === "scenario_trigger") {
          console.log("[BakeOps] scenario_trigger received:", event.data.scenario_id);
          onTrigger(
            event.data.scenario_id as string,
            event.data.scenario_text as string
          );
        }
      } catch { /* skip malformed */ }
    };

    es.onerror = () => {
      console.warn("[BakeOps] /api/events dropped — reconnecting in 1.5s");
      es?.close();
      es = null;
      // Fast reconnect so NFC taps are never missed for long
      if (!closed) retryTimer = setTimeout(connect, 1500);
    };
  }

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    es?.close();
    es = null;
  };
}
