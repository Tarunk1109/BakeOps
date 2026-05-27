import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import TopStrip from "./TopStrip";
import StaffRail from "./StaffRail";
import HeroStatus from "./HeroStatus";
import FactoryFloor from "./FactoryFloor";
import MetricsBar from "./MetricsBar";
import ActiveStream from "./ActiveStream";
import CommandBar from "./CommandBar";
import OnboardingOverlay from "./OnboardingOverlay";
import IncidentBanner from "./IncidentBanner";
import NewsTicker from "./NewsTicker";
import { subscribeTelemetry, subscribeToTriggers, triggerScenario } from "../lib/sseClient";
import { useAgentStore } from "../store/agentStore";
import type { BakeOpsEvent } from "../lib/events";

// ─── SSE event → store ────────────────────────────────────────────────────────
function handleEvent(event: BakeOpsEvent) {
  const store = useAgentStore.getState();
  switch (event.event_type) {
    case "agent_started":
      store.startEntry(event.agent_id);
      break;
    case "agent_thinking":
      store.appendToEntry(event.agent_id, (event.data.token as string) ?? "");
      break;
    case "agent_tool_call":
      store.addToolCall(event.agent_id, (event.data.tool as string) ?? "tool");
      break;
    case "agent_completed":
      store.completeEntry(event.agent_id, event.data as Record<string, unknown>);
      break;
    case "final_recommendation":
      store.setFinalRecommendation(event.data.recommendation as Record<string, unknown>);
      break;
  }
}

// ─── Scenario meta for NFC trigger ───────────────────────────────────────────
const NFC_META: Record<string, { title: string; severity: string; impact: string }> = {
  "SCN-1": { title: "Tunnel Oven Anomaly — Line 03",    severity: "Yellow", impact: "$38,000 / 24h" },
  "SCN-2": { title: "Yeast Supplier Allocation Cut",    severity: "Red",    impact: "$185,000 / 48h" },
  "SCN-3": { title: "Costco Clean Label Request",       severity: "Yellow", impact: "$12.4M revenue" },
  "SCN-4": { title: "Stonefire Naan Recall Risk",       severity: "Red",    impact: "$2.1M exposure" },
};

// ─── Screen flash overlay ─────────────────────────────────────────────────────
function ScreenFlash({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(180, 83, 9, 0.12)",
        pointerEvents: "none",
        zIndex: 9999,
        animation: "screen-flash 0.45s ease-out forwards",
      }}
    />
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const pushTelemetry       = useAgentStore((s) => s.pushTelemetry);
  const setNfcTrigger       = useAgentStore((s) => s.setNfcTrigger);
  const setScenarioStartTime = useAgentStore((s) => s.setScenarioStartTime);
  const store               = useAgentStore.getState;

  const [flash, setFlash]   = useState(false);
  const flashTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Telemetry subscription
  useEffect(() => {
    const unsub = subscribeTelemetry(pushTelemetry);
    return unsub;
  }, [pushTelemetry]);

  // NFC trigger subscription
  useEffect(() => {
    const unsub = subscribeToTriggers((scenarioId, scenarioText) => {
      const s = store();
      if (s.isRunning) return;

      // ── NFC drama sequence ─────────────────────────────────────────────────
      // 1. Screen flash
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setFlash(true);
      flashTimer.current = setTimeout(() => setFlash(false), 500);

      // 2. Show incident banner
      const meta = NFC_META[scenarioId] ?? { title: scenarioId, severity: "Yellow", impact: "" };
      setNfcTrigger({
        scenarioId,
        title:     meta.title,
        timestamp: new Date().toISOString(),
        severity:  meta.severity,
        impact:    meta.impact,
      });

      // 3. Small delay then start agents
      setTimeout(() => {
        s.reset();
        s.setRunning(true);
        s.setScenarioName(scenarioId);
        setScenarioStartTime(Date.now());

        triggerScenario(
          scenarioText,
          handleEvent,
          () => s.setRunning(false),
          (err) => { console.error(err); s.setRunning(false); }
        );
      }, 400);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  // Cleanup flash timer
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  return (
    <>
      <OnboardingOverlay />
      <ScreenFlash active={flash} />

      {/* Full-viewport shell */}
      <div
        className="flex flex-col"
        style={{ height: "100vh", background: "var(--bg-canvas)", overflow: "hidden" }}
      >
        {/* TopStrip */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <TopStrip />
        </motion.div>

        {/* Incident banner (slides under top strip) */}
        <IncidentBanner />

        {/* Main 3-column grid */}
        <div
          className="flex-1 overflow-hidden"
          style={{ display: "grid", gridTemplateColumns: "260px 1fr 440px" }}
        >
          {/* Left: StaffRail */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
            style={{ minHeight: 0, overflow: "hidden" }}
          >
            <StaffRail />
          </motion.div>

          {/* Center column */}
          <main
            className="overflow-y-auto flex flex-col gap-5 p-5"
            style={{ background: "var(--bg-canvas)" }}
          >
            {/* Hero Status */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
            >
              <HeroStatus />
            </motion.div>

            {/* Factory Floor */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.22, ease: "easeOut" }}
            >
              <FactoryFloor />
            </motion.div>

            {/* Operational Metrics */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3, ease: "easeOut" }}
              className="pb-2"
            >
              <div
                className="font-mono uppercase tracking-[0.18em] mb-3"
                style={{ fontSize: 10, color: "var(--ink-tertiary)" }}
              >
                Operational Metrics
              </div>
              <MetricsBar />
            </motion.section>
          </main>

          {/* Right: ActiveStream */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
            style={{ minHeight: 0, display: "flex", flexDirection: "column" }}
          >
            <ActiveStream />
          </motion.div>
        </div>

        {/* News ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
        >
          <NewsTicker />
        </motion.div>

        {/* Command bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
        >
          <CommandBar />
        </motion.div>
      </div>
    </>
  );
}
