import { useAgentStore } from "../store/agentStore";

export default function FinalRecommendation() {
  const rec = useAgentStore((s) => s.finalRecommendation);
  if (!rec) return null;

  const sr = rec.specialist_recommendation as Record<string, unknown>;

  return (
    <div className="rounded-lg border border-green-600 bg-green-950/30 p-4">
      <div className="text-xs text-green-400 uppercase tracking-widest mb-2 font-semibold">Final Recommendation</div>
      <p className="text-sm text-slate-200 mb-3 leading-relaxed">{String(rec.summary)}</p>
      {sr && Object.keys(sr).length > 0 && !sr.error && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Boolean(sr.diagnosis) && (
            <div className="col-span-2 bg-slate-800/60 rounded p-2">
              <span className="text-slate-400">Diagnosis: </span>
              <span className="text-slate-200">{String(sr.diagnosis)}</span>
            </div>
          )}
          {sr.predicted_failure_window_hours !== undefined && (
            <div className="bg-red-900/40 border border-red-700 rounded p-2">
              <div className="text-red-400 font-mono text-lg">{String(sr.predicted_failure_window_hours)}h</div>
              <div className="text-slate-400">to failure</div>
            </div>
          )}
          {sr.confidence !== undefined && (
            <div className="bg-slate-800/60 border border-slate-600 rounded p-2">
              <div className="text-blue-400 font-mono text-lg">{Math.round(Number(sr.confidence) * 100)}%</div>
              <div className="text-slate-400">confidence</div>
            </div>
          )}
          {sr.cost_of_action_usd !== undefined && (
            <div className="bg-slate-800/60 border border-slate-600 rounded p-2">
              <div className="text-yellow-400 font-mono">${Number(sr.cost_of_action_usd).toLocaleString()}</div>
              <div className="text-slate-400">cost of action</div>
            </div>
          )}
          {sr.cost_of_inaction_usd !== undefined && (
            <div className="bg-red-900/40 border border-red-700 rounded p-2">
              <div className="text-red-400 font-mono">${Number(sr.cost_of_inaction_usd).toLocaleString()}</div>
              <div className="text-slate-400">cost of inaction</div>
            </div>
          )}
          {Boolean(sr.recommended_action) && (
            <div className="col-span-2 bg-green-900/40 border border-green-700 rounded p-2">
              <span className="text-green-400">Action: </span>
              <span className="text-slate-200">{String(sr.recommended_action)}</span>
            </div>
          )}
          {Boolean(sr.optimal_maintenance_window) && (
            <div className="col-span-2 bg-slate-800/60 border border-slate-600 rounded p-2">
              <span className="text-slate-400">Window: </span>
              <span className="text-slate-200">{String(sr.optimal_maintenance_window)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
