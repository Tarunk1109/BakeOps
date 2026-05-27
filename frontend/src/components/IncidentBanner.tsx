import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useAgentStore } from "../store/agentStore";

// ─── Per-scenario severity / impact copy ─────────────────────────────────────
const INCIDENT_META: Record<string, { severity: "Yellow" | "Red"; impact: string }> = {
  "SCN-1": { severity: "Yellow", impact: "Predicted impact: $38,000 / 24h" },
  "SCN-2": { severity: "Red",    impact: "Predicted impact: $185,000 / 48h" },
  "SCN-3": { severity: "Yellow", impact: "Revenue at risk: $12.4M / year" },
  "SCN-4": { severity: "Red",    impact: "Recall exposure: $2.1M" },
};

export default function IncidentBanner() {
  const nfcTrigger  = useAgentStore((s) => s.nfcTrigger);
  const setNfcTrigger = useAgentStore((s) => s.setNfcTrigger);
  const [show, setShow] = useState(false);

  // Show for 8 seconds then auto-dismiss
  useEffect(() => {
    if (!nfcTrigger) { setShow(false); return; }
    setShow(true);
    const id = setTimeout(() => {
      setShow(false);
      // give exit animation 400ms then clear trigger
      setTimeout(() => setNfcTrigger(null), 400);
    }, 8000);
    return () => clearTimeout(id);
  }, [nfcTrigger, setNfcTrigger]);

  if (!nfcTrigger || !show) return null;

  const meta     = INCIDENT_META[nfcTrigger.scenarioId] ?? { severity: "Yellow", impact: "" };
  const isRed    = meta.severity === "Red";
  const accentC  = isRed ? "#B91C1C" : "#B45309";
  const bgC      = isRed ? "rgba(185,28,28,0.06)" : "rgba(180,83,9,0.05)";
  const borderC  = isRed ? "rgba(185,28,28,0.22)" : "rgba(180,83,9,0.22)";

  return (
    <div
      className="incident-slide"
      style={{
        background: bgC,
        borderTop: `2px solid ${accentC}`,
        borderBottom: `1px solid ${borderC}`,
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center gap-3 px-6 py-2.5"
        style={{ maxWidth: "100%" }}
      >
        {/* Animated warning icon */}
        <div className="flex-shrink-0">
          <AlertTriangle
            size={15}
            style={{ color: accentC }}
            className="pulse-dot"
          />
        </div>

        {/* Incident type badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm flex-shrink-0"
          style={{
            background: isRed ? "rgba(185,28,28,0.12)" : "rgba(180,83,9,0.1)",
            border: `1px solid ${borderC}`,
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.2em]"
            style={{ fontSize: 9, color: accentC, fontWeight: 600 }}
          >
            ⚠ INCIDENT REPORTED
          </span>
        </div>

        {/* Timestamp */}
        <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-tertiary)", flexShrink: 0 }}>
          {new Date(nfcTrigger.timestamp).toLocaleTimeString("en-CA", { hour12: false })} EDT
        </span>

        {/* Title */}
        <span
          className="font-sans font-semibold"
          style={{ fontSize: 13, color: "var(--ink-primary)", flex: 1, minWidth: 0 }}
        >
          {nfcTrigger.title}
        </span>

        {/* Severity + impact */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="font-mono"
            style={{ fontSize: 10, color: accentC }}
          >
            Severity: {meta.severity}
          </span>
          {meta.impact && (
            <>
              <span style={{ color: "var(--ink-muted)", fontSize: 10 }}>·</span>
              <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-tertiary)" }}>
                {meta.impact}
              </span>
            </>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => { setShow(false); setTimeout(() => setNfcTrigger(null), 300); }}
          className="flex-shrink-0 ml-2 opacity-40 hover:opacity-80 transition-opacity"
          style={{ color: "var(--ink-secondary)" }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
