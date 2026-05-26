import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";

export default function TopStrip() {
  const [time, setTime] = useState(() => _fmt(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(_fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="flex items-center px-5 border-b shrink-0"
      style={{ height: 48, borderColor: "var(--border-default)", background: "var(--bg-base)" }}
    >
      {/* Brand */}
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[22px] font-medium" style={{ color: "var(--text-primary)" }}>
          BAKEOPS
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: "var(--text-muted)", letterSpacing: "0.2em" }}
        >
          / COMMAND CENTER
        </span>
      </div>

      {/* Center plant info */}
      <div className="flex-1 text-center">
        <span
          className="font-mono text-[10px] uppercase"
          style={{ color: "var(--text-muted)", letterSpacing: "0.18em" }}
        >
          PLANT · NORTH TORONTO · LINE 01–04
        </span>
      </div>

      {/* Right: status + clock */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full pulse-dot"
            style={{ background: "var(--status-running)" }}
          />
          <span
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: "var(--status-running)" }}
          >
            NOMINAL
          </span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
          <Wifi size={12} strokeWidth={1.5} />
          <span className="font-mono text-[11px] tabular">{time}</span>
        </div>
      </div>
    </header>
  );
}

function _fmt(d: Date): string {
  return d.toLocaleTimeString("en-CA", { hour12: false });
}
