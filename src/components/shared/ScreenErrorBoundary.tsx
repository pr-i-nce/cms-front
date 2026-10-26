import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScreenError } from "@/components/shared/ScreenStates";

type Props = { children: ReactNode };
type State = { failed: boolean };

class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Screen rendering failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <ScreenError title="This screen could not open" message="A screen failed to load. Check your connection, then reload the app." />;
    }
    return this.props.children;
  }
}

export default ScreenErrorBoundary;
