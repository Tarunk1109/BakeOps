import { useState } from "react";

const STEPS = [
  {
    step: "01",
    title: "Tap an NFC card",
    body: "Each card maps to a real bakery scenario. Tap to phone — the system responds instantly.",
  },
  {
    step: "02",
    title: "Watch agents reason",
    body: "Specialist agents analyse the scenario in parallel. See their live reasoning in the stream panel.",
  },
  {
    step: "03",
    title: "Read the recommendation",
    body: "A unified executive recommendation synthesises all findings — with costs, confidence, and a clear action.",
  },
];

const STORAGE_KEY = "bakeops_onboarding_dismissed";

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(STORAGE_KEY); } catch { return true; }
  });

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* */ }
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "rgba(14,14,16,0.55)", backdropFilter: "blur(4px)", zIndex: 1000 }}
      onClick={dismiss}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          width: 480,
          background: "var(--bg-paper)",
          border: "1px solid var(--border-soft)",
          boxShadow: "0 24px 64px rgba(14,14,16,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid var(--border-hairline)" }}>
          <div className="font-mono uppercase tracking-[0.18em] mb-2" style={{ fontSize: 10, color: "var(--ink-muted)" }}>
            BakeOps Command Center
          </div>
          <div className="font-display font-medium" style={{ fontSize: 24, color: "var(--ink-primary)", letterSpacing: "-0.02em" }}>
            Welcome to the demo
          </div>
        </div>

        {/* Steps */}
        <div className="px-8 py-6 flex flex-col gap-5">
          {STEPS.map(({ step, title, body }) => (
            <div key={step} className="flex gap-4">
              <div
                className="font-mono font-medium flex-shrink-0 mt-0.5"
                style={{ fontSize: 13, color: "var(--accent)", width: 20 }}
              >
                {step}
              </div>
              <div>
                <div className="font-sans font-semibold mb-1" style={{ fontSize: 14, color: "var(--ink-primary)" }}>
                  {title}
                </div>
                <p className="font-sans" style={{ fontSize: 13, color: "var(--ink-tertiary)", lineHeight: 1.6 }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-8 pb-8">
          <button
            onClick={dismiss}
            className="w-full py-3 rounded-lg font-sans font-medium"
            style={{
              fontSize: 15,
              background: "var(--accent)",
              color: "#FFFFFF",
            }}
          >
            Start demo →
          </button>
        </div>
      </div>
    </div>
  );
}
