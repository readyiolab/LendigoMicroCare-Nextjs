import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Customer-safe boundary for dashboard main content.
 * Never shows raw TypeError / stack traces to the customer.
 */
export class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[DashboardErrorBoundary]", error, errorInfo);
  }

  handleRefresh = () => {
    this.setState({ hasError: false });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-sm text-slate-500 mt-2">
            Please refresh to continue your application. If this keeps happening, contact support.
          </p>
          <Button
            onClick={this.handleRefresh}
            className="mt-6 bg-[#222222] hover:bg-[#111111] text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
