import type { BakeOpsEvent } from "./events";

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

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
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
          if (event.event_type === "stream_done") {
            onDone();
            return;
          }
          onEvent(event);
        } catch {
          // skip malformed
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
