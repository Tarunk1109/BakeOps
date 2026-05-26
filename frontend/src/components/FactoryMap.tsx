import { useEffect, useState } from "react";

interface Equipment {
  id: string;
  type: string;
  health_score: number;
  anomaly?: string;
}

interface Line {
  id: string;
  product: string;
  status: string;
  throughput_per_hour: number;
  target_per_hour: number;
  equipment: Equipment[];
}

interface FactoryState {
  facility: string;
  lines: Line[];
}

function healthColor(score: number): string {
  if (score >= 0.85) return "text-green-400";
  if (score >= 0.70) return "text-yellow-400";
  return "text-red-400";
}

function healthBg(score: number): string {
  if (score >= 0.85) return "bg-green-900/40 border-green-700";
  if (score >= 0.70) return "bg-yellow-900/40 border-yellow-700";
  return "bg-red-900/40 border-red-700";
}

export default function FactoryMap() {
  const [factory, setFactory] = useState<FactoryState | null>(null);

  useEffect(() => {
    fetch("/api/factory_state")
      .then((r) => r.json())
      .then(setFactory)
      .catch(console.error);
  }, []);

  if (!factory) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Loading factory state...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 overflow-auto">
      <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">{factory.facility}</div>
      {factory.lines.map((line) => {
        const minHealth = Math.min(...line.equipment.map((e) => e.health_score));
        const pct = Math.round((line.throughput_per_hour / line.target_per_hour) * 100);
        const hasAnomaly = line.equipment.some((e) => e.anomaly);
        return (
          <div key={line.id} className={`rounded border p-2 ${healthBg(minHealth)} ${hasAnomaly ? "ring-1 ring-red-500" : ""}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-sm">{line.product}</span>
              {hasAnomaly && <span className="text-xs bg-red-700 text-red-100 px-1 rounded">ANOMALY</span>}
              <span className={`text-xs font-mono ${healthColor(minHealth)}`}>{pct}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 mb-2">
              <div
                className={`h-1 rounded-full ${minHealth >= 0.85 ? "bg-green-400" : minHealth >= 0.70 ? "bg-yellow-400" : "bg-red-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {line.equipment.map((eq) => (
                <div key={eq.id} className={`text-xs px-1.5 py-0.5 rounded border ${healthBg(eq.health_score)} ${healthColor(eq.health_score)}`}>
                  {eq.type.replace(/_/g, " ")} {Math.round(eq.health_score * 100)}%
                  {eq.anomaly && " ⚠"}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
