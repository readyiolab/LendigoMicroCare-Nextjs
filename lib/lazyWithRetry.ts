import { lazy, type ComponentType } from "react"

const RELOAD_KEY = "lendigo:chunk-reload"

export function isChunkLoadError(error: unknown) {
  const err = error as { name?: unknown; message?: unknown } | null | undefined
  const msg = String(err?.message || error || "")
  return (
    err?.name === "ChunkLoadError" ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Loading CSS chunk [\d]+ failed/i.test(msg)
  )
}

/** One hard reload after deploy when old hashed chunks 404. */
export function reloadOnceForStaleChunk(error: unknown) {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === "1") {
      sessionStorage.removeItem(RELOAD_KEY)
      return false
    }
    sessionStorage.setItem(RELOAD_KEY, "1")
  } catch {
    // sessionStorage blocked: still try once via location reload
  }
  window.location.reload()
  return true
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * React.lazy that recovers from post-deploy chunk 404s with a single reload.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own ComponentType<any> constraint
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory()
      clearChunkReloadFlag()
      return mod
    } catch (error) {
      if (reloadOnceForStaleChunk(error)) {
        return { default: (() => null) as unknown as T }
      }
      throw error
    }
  })
}
