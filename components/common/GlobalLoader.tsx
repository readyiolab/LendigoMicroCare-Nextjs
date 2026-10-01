"use client"

import { useAppSelector } from "@/store"
import { Spinner } from "@/components/ui/spinner"

export default function GlobalLoader() {
  const { isLoading, loadingMessage } = useAppSelector((state) => state.ui)

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] animate-in fade-in duration-300">
      <Spinner className="mb-4" />
      {loadingMessage && <p className="text-gray-600 text-sm font-medium animate-pulse tracking-tight">{loadingMessage}</p>}
    </div>
  )
}
