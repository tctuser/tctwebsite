import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Ohne diese Komponente führt ein einziger unerwarteter Fehler irgendwo im
// Baum (z. B. unerwartete Datenform aus Supabase) zu einem komplett weißen
// Bildschirm ohne jeden Ausweg außer manuellem Neuladen. Klassische
// Komponente, weil React Error Boundaries bislang keinen Hook dafür bietet.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Unerwarteter Fehler in der Anwendung:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="app-crash">
        <div className="app-crash-card">
          <p className="eyebrow">
            <span /> Es tut uns leid
          </p>
          <h1>
            Etwas ist
            <br />
            <em>schiefgelaufen.</em>
          </h1>
          <p>
            Auf dieser Seite ist ein unerwarteter Fehler aufgetreten. Ein
            Neuladen behebt das in der Regel.
          </p>
          <button
            className="button button-light"
            type="button"
            onClick={() => window.location.assign("/")}
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }
}
