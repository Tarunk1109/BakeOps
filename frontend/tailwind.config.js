/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0B",
        surface: "#131316",
        elevated: "#1C1C20",
        "border-subtle": "#1F1F23",
        "border-default": "#2A2A30",
        "border-strong": "#3D3D45",
        accent: "#F59E0B",
        "accent-muted": "#D97706",
        "accent-dim": "#78350F",
        "status-running": "#10B981",
        "status-warning": "#F59E0B",
        "status-danger": "#EF4444",
        "status-info": "#3B82F6",
        "agent-orchestrator": "#FAFAFA",
        "agent-maintenance": "#F59E0B",
        "agent-supply": "#3B82F6",
        "agent-recipe": "#A78BFA",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px", letterSpacing: "0.08em" }],
        xs: ["11px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "22px" }],
      },
    },
  },
  plugins: [],
};
