import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useAgentStore } from "../store/agentStore";

// ─── Manual vs BakeOps time per scenario type ─────────────────────────────────
const SPEED_DATA: Record<string, { manualLabel: string; manualSec: number; multiplier: string }> = {
  maintenance: { manualLabel: "6h 30m",  manualSec: 23400, multiplier: "~23,000×" },
  supply:      { manualLabel: "3d 7h",   manualSec: 288000, multiplier: "~3,200×" },
  recipe:      { manualLabel: "87 days", manualSec: 7516800, multiplier: "~88,000×" },
  multi:       { manualLabel: "2d 4h",   manualSec: 194400, multiplier: "~2,400×" },
};

function inferType(scenarioName: string): keyof typeof SPEED_DATA {
  const s = scenarioName.toLowerCase();
  if (/scn-1|oven|tunnel|maintenance|heating/i.test(s))   return "maintenance";
  if (/scn-2|yeast|supply|lallemand|shortage/i.test(s))   return "supply";
  if (/scn-3|label|reformul|costco|croissant/i.test(s))   return "recipe";
  if (/scn-4|recall|mold|stonefire/i.test(s))             return "maintenance";
  return "multi";
}

function fmtElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  return `${s}s`;
}

function CountUp({ target, durationMs = 900 }: { target: string; durationMs?: number }) {
  const numericTarget = parseFloat(target.replace(/[^0-9.]/g, "")) || 0;
  const suffix = target.replace(/[0-9.]/g, "");
  const [val, setVal] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(numericTarget * ease);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [numericTarget, durationMs]);

  const display = numericTarget >= 10 ? val.toFixed(0) : val.toFixed(1);
  return <>{display}{suffix}</>;
}

export default function SpeedComparison() {
  const scenarioName     = useAgentStore((s) => s.scenarioName);
  const scenarioStartTime = useAgentStore((s) => s.scenarioStartTime);
  const [visible, setVisible] = useState(false);

  const type    = inferType(scenarioName);
  const data    = SPEED_DATA[type];
  const elapsed = scenarioStartTime ? Date.now() - scenarioStartTime : 0;
  const elapsedLabel = fmtElapsed(elapsed);
  const elapsedNum   = (elapsed / 1000).toFixed(1);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="speed-reveal rounded-lg overflow-hidden"
      style={{
        background: "rgba(250,250,247,0.06)",
        border: "1px solid var(--border-ink-soft)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border-ink-soft)" }}
      >
        <span
          className="font-mono uppercase tracking-[0.2em]"
          style={{ fontSize: 9, color: "var(--paper-tertiary)" }}
        >
          Response Time
        </span>
      </div>

      <div className="px-4 py-3">
        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2" style={{ gap: 1 }}>
          {/* Manual */}
          <div
            className="flex flex-col gap-1 pr-3"
            style={{
              borderRight: "1px solid var(--border-ink-soft)",
              animationDelay: "200ms",
            }}
          >
            <span
              className="font-mono uppercase tracking-wider"
              style={{ fontSize: 8, color: "var(--paper-tertiary)" }}
            >
              Manual process
            </span>
            <span
              className="font-display font-medium"
              style={{ fontSize: 22, color: "var(--paper-tertiary)", lineHeight: 1 }}
            >
              {data.manualLabel}
            </span>
            <span className="font-mono" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.5 }}>
              industry estimate
            </span>
          </div>

          {/* BakeOps */}
          <div className="flex flex-col gap-1 pl-3" style={{ animationDelay: "400ms" }}>
            <span
              className="font-mono uppercase tracking-wider"
              style={{ fontSize: 8, color: "var(--agent-maintenance-dark)" }}
            >
              BakeOps
            </span>
            <span
              className="font-display font-medium tabular"
              style={{ fontSize: 32, color: "var(--paper-primary)", lineHeight: 1 }}
            >
              <CountUp target={elapsedNum} durationMs={900} />
              <span style={{ fontSize: 16, opacity: 0.7 }}>s</span>
            </span>
            <span className="font-mono" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.5 }}>
              actual elapsed
            </span>
          </div>
        </div>

        {/* Speed multiplier */}
        <div
          className="flex items-center gap-2 mt-3 pt-2.5"
          style={{
            borderTop: "1px solid var(--border-ink-soft)",
            animationDelay: "1200ms",
          }}
        >
          <Zap size={12} style={{ color: "var(--agent-maintenance-dark)", flexShrink: 0 }} />
          <span
            className="font-sans font-semibold"
            style={{ fontSize: 13, color: "var(--agent-maintenance-dark)" }}
          >
            {data.multiplier} faster
          </span>
          <span className="font-mono ml-auto" style={{ fontSize: 8, color: "var(--paper-tertiary)" }}>
            {elapsedLabel} total
          </span>
        </div>
      </div>
    </div>
  );
}
