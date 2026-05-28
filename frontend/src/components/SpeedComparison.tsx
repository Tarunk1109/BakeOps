import { useEffect, useState } from "react";
import { Zap, Clock } from "lucide-react";
import { useAgentStore } from "../store/agentStore";

// ─── Speed data per scenario type ─────────────────────────────────────────────
const SPEED_DATA: Record<string, { manualLabel: string; manualSec: number; multiplier: string; context: string }> = {
  maintenance: { manualLabel: "6h 30m",  manualSec: 23400,   multiplier: "~23,000×", context: "vs. manual equipment review" },
  supply:      { manualLabel: "3d 7h",   manualSec: 288000,  multiplier: "~3,200×",  context: "vs. procurement analysis" },
  recipe:      { manualLabel: "87 days", manualSec: 7516800, multiplier: "~88,000×", context: "vs. R&D reformulation cycle" },
  multi:       { manualLabel: "2d 4h",   manualSec: 194400,  multiplier: "~2,400×",  context: "vs. cross-functional review" },
};

function inferType(scenarioName: string): keyof typeof SPEED_DATA {
  const s = scenarioName.toLowerCase();
  if (/scn-1|oven|tunnel|maintenance|heating/i.test(s))  return "maintenance";
  if (/scn-2|yeast|supply|lallemand|shortage/i.test(s))  return "supply";
  if (/scn-3|label|reformul|costco|croissant/i.test(s))  return "recipe";
  if (/scn-4|recall|mold|stonefire/i.test(s))            return "maintenance";
  return "multi";
}

function fmtElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function CountUp({ target, durationMs = 1000 }: { target: string; durationMs?: number }) {
  const numericTarget = parseFloat(target.replace(/[^0-9.]/g, "")) || 0;
  const suffix        = target.replace(/[0-9.]/g, "");
  const [val, setVal] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t    = Math.min((now - start) / durationMs, 1);
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
  const scenarioName      = useAgentStore((s) => s.scenarioName);
  const scenarioStartTime = useAgentStore((s) => s.scenarioStartTime);
  const [visible, setVisible] = useState(false);

  const type    = inferType(scenarioName);
  const data    = SPEED_DATA[type];
  const elapsed = scenarioStartTime ? Date.now() - scenarioStartTime : 0;
  const elapsedLabel  = fmtElapsed(elapsed);
  const elapsedNum    = (elapsed / 1000).toFixed(1);
  const speedupFactor = elapsed > 0 ? Math.round(data.manualSec / (elapsed / 1000)) : 0;

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="speed-reveal rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, rgba(245,158,11,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(245,158,11,0.16)",
        borderLeft: "2px solid rgba(245,158,11,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <Clock size={10} style={{ color: "var(--paper-tertiary)" }} strokeWidth={1.5} />
          <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 8.5, color: "var(--paper-tertiary)" }}>
            Response Time Comparison
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 8.5, color: "var(--paper-tertiary)", opacity: 0.6 }}>
          {data.context}
        </span>
      </div>

      <div className="px-4 py-4">
        {/* Side-by-side numbers */}
        <div className="grid grid-cols-2 gap-0">
          {/* Manual */}
          <div
            className="flex flex-col gap-1 pr-4"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.6 }}>
              Manual Process
            </span>
            <span
              className="font-display font-medium tabular"
              style={{ fontSize: 26, color: "rgba(255,255,255,0.35)", lineHeight: 1, letterSpacing: "-0.02em" }}
            >
              {data.manualLabel}
            </span>
            <span className="font-mono" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.4 }}>
              industry estimate
            </span>
          </div>

          {/* BakeOps */}
          <div className="flex flex-col gap-1 pl-4">
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 8, color: "var(--agent-maintenance-dark)" }}>
              BakeOps AI
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className="font-display font-medium tabular"
                style={{ fontSize: 36, color: "var(--paper-primary)", lineHeight: 1, letterSpacing: "-0.025em" }}
              >
                <CountUp target={elapsedNum} durationMs={1000} />
              </span>
              <span className="font-mono" style={{ fontSize: 14, color: "var(--paper-secondary)", opacity: 0.7 }}>s</span>
            </div>
            <span className="font-mono" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.4 }}>
              actual elapsed
            </span>
          </div>
        </div>

        {/* Speedup bar */}
        <div className="mt-4 pt-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.5 }}>Speed advantage</span>
            <span className="font-mono tabular" style={{ fontSize: 9, color: "var(--paper-tertiary)", opacity: 0.5 }}>
              {elapsedLabel} total
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div
                className="h-1.5 rounded-full bar-fill"
                style={{
                  width: "100%",
                  background: "linear-gradient(90deg, rgba(245,158,11,0.5), rgba(245,158,11,0.9))",
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Zap size={11} style={{ color: "var(--agent-maintenance-dark)" }} strokeWidth={1.5} />
              <span
                className="font-display font-medium"
                style={{ fontSize: 15, color: "var(--agent-maintenance-dark)", letterSpacing: "-0.01em" }}
              >
                {data.multiplier} faster
              </span>
            </div>
          </div>
        </div>

        {/* Actual factor if computable */}
        {speedupFactor > 10 && (
          <div className="mt-2">
            <span className="font-mono" style={{ fontSize: 8, color: "var(--paper-tertiary)", opacity: 0.4 }}>
              Actual for this run: {speedupFactor.toLocaleString()}× faster than manual
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
