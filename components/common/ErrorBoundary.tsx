"use client"

import React, { type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { isChunkLoadError, reloadOnceForStaleChunk } from "@/lib/lazyWithRetry"

interface ErrorBoundaryProps {
  children?: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
    // Stale chunks after a deploy: hard reload once to pick up the new build.
    if (reloadOnceForStaleChunk(error)) return
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      const chunkMiss = isChunkLoadError(this.state.error)
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center border border-gray-100">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{chunkMiss ? "App updated" : "Something went wrong"}</h1>
            <p className="text-gray-500 mb-6">
              {chunkMiss
                ? "A new version was deployed. Refresh to load the latest app."
                : "We encountered an unexpected error. Please try again or contact support if the problem persists."}
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 text-left rounded-lg overflow-auto max-h-40 text-xs text-red-800 font-mono">
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={this.handleReset} className="w-full bg-black hover:bg-zinc-800 text-white">
                <RefreshCw className="w-4 h-4 mr-2" /> {chunkMiss ? "Refresh now" : "Try Again"}
              </Button>
              {!chunkMiss && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the crashed tree must be discarded by a full reload
                    window.location.href = "/dashboard"
                  }}
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
