import FactoryMap from "./FactoryMap";
import AgentPanel from "./AgentPanel";
import ScenarioInput from "./ScenarioInput";
import FinalRecommendation from "./FinalRecommendation";

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <div className="text-xl font-bold tracking-tight text-white">
          🏭 BakeOps <span className="text-violet-400">Command Center</span>
        </div>
        <div className="ml-auto text-xs text-slate-500 font-mono">
          Multi-Agent AI · Real-Time Streaming
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Factory Map */}
        <aside className="w-72 border-r border-slate-800 p-4 overflow-y-auto flex-shrink-0">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Factory Map</div>
          <FactoryMap />
        </aside>

        {/* Center: Agent Panels */}
        <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <AgentPanel agentId="orchestrator" />
            <AgentPanel agentId="maintenance_prophet" />
          </div>

          {/* Final Recommendation */}
          <FinalRecommendation />

          {/* Scenario Input */}
          <div className="border-t border-slate-800 pt-4">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Scenario Input</div>
            <ScenarioInput />
          </div>
        </main>
      </div>
    </div>
  );
}
