import { useEffect, useState } from "react";
import { AlertTriangle, X, Zap } from "lucide-react";
import { useAgentStore } from "../store/agentStore";

const INCIDENT_META: Record<string, { severity: "Yellow" | "Red"; impact: string }> = {
  "SCN-1": { severity: "Yellow", impact: "$38,000 / 24h" },
  "SCN-2": { severity: "Red",    impact: "$185,000 / 48h" },
  "SCN-3": { severity: "Yellow", impact: "$12.4M / year" },
  "SCN-4": { severity: "Red",    impact: "$2.1M exposure" },
};

export default function IncidentBanner() {
  const nfcTrigger    = useAgentStore((s) => s.nfcTrigger);
  const setNfcTrigger = useAgentStore((s) => s.setNfcTrigger);
  const [show, setShow] = useState(false);

  // Auto-dismiss after 9s
  useEffect(() => {
    if (!nfcTrigger) { setShow(false); return; }
    setShow(true);
    const id = setTimeout(() => {
      setShow(false);
      setTimeout(() => setNfcTrigger(null), 400);
    }, 9000);
    return () => clearTimeout(id);
  }, [nfcTrigger, setNfcTrigger]);

  if (!nfcTrigger || !show) return null;

  const meta    = INCIDENT_META[nfcTrigger.scenarioId] ?? { severity: "Yellow", impact: "" };
  const isRed   = meta.severity === "Red";
  const accentC = isRed ? "#B91C1C" : "#B45309";
  const bgC     = isRed ? "rgba(185,28,28,0.05)" : "rgba(180,83,9,0.04)";
  const borderC = isRed ? "rgba(185,28,28,0.20)" : "rgba(180,83,9,0.20)";
  const softBg  = isRed ? "rgba(185,28,28,0.10)" : "rgba(180,83,9,0.08)";

  return (
    <div
      className="incident-slide"
      style={{
        background: bgC,
        borderTop: `2px solid ${accentC}`,
        borderBottom: `1px solid ${borderC}`,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-3 px-5 py-2">
        {/* Pulsing icon */}
        <div
          className="flex items-center justify-center rounded-md flex-shrink-0"
          style={{ width: 24, height: 24, background: softBg }}
        >
          <AlertTriangle size={12} style={{ color: accentC }} strokeWidth={2} className="pulse-dot" />
        </div>

        {/* Badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md flex-shrink-0"
          style={{ background: softBg, border: `1px solid ${borderC}` }}
        >
          <Zap size={8} style={{ color: accentC }} strokeWidth={2} />
          <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 8.5, color: accentC, fontWeight: 600 }}>
            {isRed ? "Critical" : "Incident"} Detected
          </span>
        </div>

        {/* Time */}
        <span className="font-mono" style={{ fontSize: 9.5, color: "var(--ink-tertiary)", flexShrink: 0 }}>
          {new Date(nfcTrigger.timestamp).toLocaleTimeString("en-CA", { hour12: false })}
        </span>

        {/* Title */}
        <span className="font-sans font-semibold" style={{ fontSize: 13, color: "var(--ink-primary)", flex: 1, minWidth: 0, letterSpacing: "-0.01em" }}>
          {nfcTrigger.title}
        </span>

        {/* Severity + impact */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="px-1.5 py-0.5 rounded"
            style={{
              background: isRed ? "rgba(185,28,28,0.10)" : "rgba(180,83,9,0.08)",
              border: `1px solid ${borderC}`,
            }}
          >
            <span className="font-mono" style={{ fontSize: 8.5, color: accentC }}>
              {meta.severity}
            </span>
          </div>
          {meta.impact && (
            <span className="font-mono" style={{ fontSize: 9.5, color: "var(--ink-tertiary)" }}>
              {meta.impact}
            </span>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => { setShow(false); setTimeout(() => setNfcTrigger(null), 300); }}
          className="flex-shrink-0 ml-1"
          style={{ color: "var(--ink-muted)", opacity: 0.5, lineHeight: 0, transition: "opacity 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"; }}
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
