// ─── Bloomberg-style FGF industry news ticker ─────────────────────────────────

const HEADLINES = [
  "Saskatchewan wheat futures +3.2% on drought forecast · Prairie harvest outlook revised downward",
  "Lallemand Inc. resumes partial yeast production at Montreal facility · Allocation to normalise Q3",
  "Costco Q3 clean-label compliance deadline confirmed: Sept 30, 2026 · 180+ SKUs under review",
  "Canadian Pacific rail disruption: Western flour shipments delayed 48h · Ardent Mills activating contingency",
  "Stonefire naan demand projection +18% for Canada Day weekend · North York running 3-shift schedule",
  "Wholesale butter prices flat W/W · Cream up 1.4% on Ontario processor capacity constraints",
  "ACE Bakery sourdough wins 2026 SIAL innovation gold · Premium bread segment grows 12% YoY",
  "CFIA introduces updated clean-label guidelines · \"Natural\" claims require full additive disclosure by 2027",
  "Whole Foods Canada expands FGF Fancy Pants shelf space · 240 new store facings confirmed",
  "Lallemand yeast: AB Mauri confirmed as secondary supplier · Dual-source strategy operational",
];

const joined = HEADLINES.join("  ·  ") + "  ·  "; // double for seamless loop

export default function NewsTicker() {
  return (
    <div
      className="flex items-center overflow-hidden"
      style={{
        height: 32,
        background: "var(--bg-paper)",
        borderTop: "1px solid var(--border-hairline)",
        flexShrink: 0,
      }}
    >
      {/* Left label */}
      <div
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{
          height: "100%",
          borderRight: "1px solid var(--border-hairline)",
          background: "var(--bg-paper-warm)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full pulse-dot flex-shrink-0"
          style={{ background: "var(--accent)" }}
        />
        <span
          className="font-mono uppercase tracking-[0.2em] whitespace-nowrap"
          style={{ fontSize: 9, color: "var(--accent)" }}
        >
          Market
        </span>
      </div>

      {/* Scrolling text */}
      <div className="flex-1 overflow-hidden relative">
        <div
          style={{
            display: "flex",
            whiteSpace: "nowrap",
            animation: "ticker-scroll 75s linear infinite",
          }}
        >
          {/* Duplicate for seamless loop */}
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--ink-tertiary)", paddingLeft: 24 }}
          >
            {joined}{joined}
          </span>
        </div>
      </div>
    </div>
  );
}
