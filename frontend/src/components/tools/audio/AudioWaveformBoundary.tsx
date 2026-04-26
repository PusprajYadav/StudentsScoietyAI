import { Component, type ErrorInfo, type ReactNode } from "react";
import { AudioWaveformFallback } from "./AudioWaveformFallback";
import type { AudioWorkspaceFile } from "./types";

interface AudioWaveformBoundaryProps {
  children: ReactNode;
  file: AudioWorkspaceFile | null;
}

interface AudioWaveformBoundaryState {
  hasError: boolean;
  message: string | null;
}

export class AudioWaveformBoundary extends Component<
  AudioWaveformBoundaryProps,
  AudioWaveformBoundaryState
> {
  state: AudioWaveformBoundaryState = {
    hasError: false,
    message: null,
  };

  static getDerivedStateFromError(error: Error): AudioWaveformBoundaryState {
    return {
      hasError: true,
      message: error.message || "Waveform view is not available for this file.",
    };
  }

  componentDidUpdate(prevProps: AudioWaveformBoundaryProps) {
    if (this.state.hasError && prevProps.file?.id !== this.props.file?.id) {
      this.setState({
        hasError: false,
        message: null,
      });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AudioWaveformBoundary] waveform render failed", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <AudioWaveformFallback file={this.props.file} error={this.state.message} />;
    }

    return this.props.children;
  }
}
