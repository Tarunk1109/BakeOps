import { useEffect, useState } from "react";
import { useAgentStore } from "../store/agentStore";

export default function TopStrip() {
  const [time, setTime] = useState(() => _fmt(new Date()));
  const totalOutput = useAgentStore((s) => s.metrics.totalOutput.value);
  const isRunning   = useAgentStore((s) => s.isRunning);

  useEffect(() => {
    const id = setInterval(() => setTime(_fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="flex items-center px-8 shrink-0"
      style={{
        height: 56,
        background: "var(--bg-canvas)",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      {/* Brand */}
      <div className="flex flex-col leading-tight">
        <span className="font-display font-medium" style={{ fontSize: 22, color: "var(--ink-primary)" }}>
          BakeOps
        </span>
        <span className="font-display italic" style={{ fontSize: 12, color: "var(--ink-tertiary)" }}>
          Command Center
        </span>
      </div>

      {/* Center — plant info */}
      <div className="flex-1 flex flex-col items-center gap-0.5">
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 11, color: "var(--ink-tertiary)" }}
        >
          Plant 01 · North York, Toronto
        </span>
        <span className="font-sans" style={{ fontSize: 13, color: "var(--ink-tertiary)" }}>
          4 lines · {Math.round(totalOutput).toLocaleString()} units / hr
        </span>
      </div>

      {/* Right — status + clock */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full pulse-dot"
            style={{ background: isRunning ? "var(--accent)" : "var(--status-running)" }}
          />
          <span
            className="font-mono uppercase tracking-wider"
            style={{ fontSize: 11, color: isRunning ? "var(--accent)" : "var(--status-running)" }}
          >
            {isRunning ? "Monitoring" : "Nominal"}
          </span>
        </div>
        <span
          className="font-mono tabular"
          style={{ fontSize: 14, color: "var(--ink-secondary)" }}
        >
          {time}
        </span>
      </div>
    </header>
  );
}

function _fmt(d: Date): string {
  return d.toLocaleTimeString("en-CA", { hour12: false, timeZoneName: "short" });
}
