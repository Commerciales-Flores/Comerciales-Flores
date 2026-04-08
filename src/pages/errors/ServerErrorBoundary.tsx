import React from "react";
import type { ErrorInfo } from "react";
import { ServerErrorPage } from ".";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ServerErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Caught in ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ServerErrorPage />;
    }

    return this.props.children;
  }
}