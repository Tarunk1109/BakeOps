import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, background: "#FAFAF7", color: "#0E0E10", fontFamily: "'JetBrains Mono', monospace", minHeight: "100vh" }}>
          <div style={{ color: "#B91C1C", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>⚠ BakeOps crashed during render</div>
          <pre style={{ color: "#B45309", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#F6F4EF", padding: 16, borderRadius: 8, border: "1px solid rgba(14,14,16,0.08)" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
