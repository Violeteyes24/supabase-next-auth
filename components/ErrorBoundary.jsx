import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to your service or console
    console.error("Caught error:", error, errorInfo);
    this.setState({ hasError: true });
  }

  render() {
    if (this.state.hasError) {
      // Render nothing or a minimal fallback
      return null;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
