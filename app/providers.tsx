"use client"

import { useState, type ReactNode } from "react"
import { Provider } from "react-redux"
import { makeStore } from "@/store"
import ErrorBoundary from "@/components/common/ErrorBoundary"
import GlobalLoader from "@/components/common/GlobalLoader"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider, AdminAuthProvider, NotificationProvider } from "@/contexts"
import { clearChunkReloadFlag } from "@/lib/lazyWithRetry"

if (typeof window !== "undefined") {
  clearChunkReloadFlag()
}

export function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore)

  return (
    <Provider store={store}>
      <ErrorBoundary>
        <TooltipProvider>
          <AuthProvider>
            <AdminAuthProvider>
              <NotificationProvider>
                {children}
                <GlobalLoader />
              </NotificationProvider>
            </AdminAuthProvider>
          </AuthProvider>
        </TooltipProvider>
      </ErrorBoundary>
    </Provider>
  )
}
