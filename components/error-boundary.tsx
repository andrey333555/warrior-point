"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || "Что-то пошло не так",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-white">
          <p className="text-4xl">⚠️</p>
          <p className="text-lg font-semibold">Не удалось загрузить экран</p>
          <ErrorMessage
            message={this.state.message}
            className="max-w-sm text-center"
            onRetry={() => this.setState({ hasError: false, message: "" })}
          />
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Обновить
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
