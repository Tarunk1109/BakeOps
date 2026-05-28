import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Network, FileText, X } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: <Network size={16} strokeWidth={1.5} />,
    title: "Tap an NFC card",
    body: "Each card maps to a real FGF Brands bakery scenario. Tap to phone — multi-agent AI responds in seconds.",
    color: "#B45309",
  },
  {
    step: "02",
    icon: <Zap size={16} strokeWidth={1.5} />,
    title: "Watch agents reason",
    body: "Specialist agents — Maintenance Prophet, Supply Sentinel, Recipe Chemist — analyse in parallel. See live reasoning in the stream panel.",
    color: "#1D4ED8",
  },
  {
    step: "03",
    icon: <FileText size={16} strokeWidth={1.5} />,
    title: "Read the recommendation",
    body: "A unified executive recommendation with costs, confidence scores, and a clear action plan — in seconds, not hours.",
    color: "#15803D",
  },
];

const STORAGE_KEY = "bakeops_onboarding_dismissed";

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(STORAGE_KEY); } catch { return true; }
  });

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {/* */}
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(14,14,16,0.60)", backdropFilter: "blur(6px)", zIndex: 1000 }}
          onClick={dismiss}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 480,
              background: "var(--bg-paper)",
              border: "1px solid var(--border-soft)",
              borderTop: "3px solid var(--accent)",
              borderRadius: 16,
              boxShadow: "0 32px 80px rgba(14,14,16,0.22), 0 4px 16px rgba(14,14,16,0.08)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-8 pt-7 pb-5 flex items-start justify-between"
              style={{ borderBottom: "1px solid var(--border-hairline)" }}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {/* Logo */}
                  <div
                    style={{
                      width: 24, height: 24, borderRadius: 7,
                      background: "linear-gradient(135deg, #B45309, #92400E)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#FEF3C7", fontWeight: 700, fontFamily: "monospace" }}>B</span>
                  </div>
                  <span className="font-mono uppercase tracking-[0.16em]" style={{ fontSize: 9.5, color: "var(--ink-muted)" }}>
                    BakeOps Command Center
                  </span>
                </div>
                <div className="font-display font-medium" style={{ fontSize: 22, color: "var(--ink-primary)", letterSpacing: "-0.02em" }}>
                  Welcome to the demo
                </div>
              </div>
              <button
                onClick={dismiss}
                style={{ color: "var(--ink-muted)", lineHeight: 0, marginTop: 2 }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Steps */}
            <div className="px-8 py-6 flex flex-col gap-5">
              {STEPS.map(({ step, icon, title, body, color }, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.25, ease: "easeOut" }}
                  className="flex gap-4"
                >
                  {/* Step icon */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-lg"
                    style={{
                      width: 36, height: 36,
                      background: color + "10",
                      border: `1px solid ${color}22`,
                      color,
                    }}
                  >
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-mono" style={{ fontSize: 9, color: "var(--ink-muted)" }}>{step}</span>
                      <span className="font-sans font-semibold" style={{ fontSize: 14, color: "var(--ink-primary)", letterSpacing: "-0.005em" }}>
                        {title}
                      </span>
                    </div>
                    <p className="font-sans" style={{ fontSize: 13, color: "var(--ink-tertiary)", lineHeight: 1.65 }}>
                      {body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-8 pb-7">
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.25 }}
                onClick={dismiss}
                className="w-full py-3 rounded-xl font-sans font-semibold"
                style={{
                  fontSize: 15,
                  background: "var(--accent)",
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                }}
              >
                Start demo →
              </motion.button>
              <p className="text-center font-mono mt-3" style={{ fontSize: 9, color: "var(--ink-muted)" }}>
                Click anywhere outside to dismiss
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
