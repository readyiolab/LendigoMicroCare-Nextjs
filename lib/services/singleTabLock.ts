export type TabScope = "customer" | "admin"

interface TabLock {
  scope: TabScope
  tabId: string
  at: number
}

const CHANNEL_NAME = "lendigo-tab-lock"
const LOCK_KEY = "lendigo_tab_lock"
const HEARTBEAT_MS = 2000

function readLock(): TabLock | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    return raw ? (JSON.parse(raw) as TabLock) : null
  } catch {
    return null
  }
}

function writeLock(scope: TabScope, tabId: string) {
  localStorage.setItem(LOCK_KEY, JSON.stringify({ scope, tabId, at: Date.now() }))
}

export function getOrCreateTabId() {
  const existing = sessionStorage.getItem("lendigo_tab_id")
  if (existing) return existing
  const tabId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
  sessionStorage.setItem("lendigo_tab_id", tabId)
  return tabId
}

/**
 * Claim this tab as the only active UI for the scope (customer | admin).
 * Broadcasts to other tabs so they can log out.
 */
export function claimTabLock(scope: TabScope, tabId: string = getOrCreateTabId()) {
  writeLock(scope, tabId)
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage({ type: "TAB_CLAIM", scope, tabId })
    channel.close()
  } catch {
    /* BroadcastChannel unsupported */
  }
  return tabId
}

/**
 * Monitor for another tab taking over the same scope.
 * @returns cleanup function
 */
export function startTabLockMonitor({
  scope,
  tabId,
  onSuperseded,
}: {
  scope: TabScope
  tabId: string
  onSuperseded: () => void
}) {
  if (typeof window === "undefined") return () => {}

  let channel: BroadcastChannel | null
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event: MessageEvent<{ type?: string; scope?: string; tabId?: string } | null>) => {
      const data = event.data || {}
      if (data.type === "TAB_CLAIM" && data.scope === scope && data.tabId !== tabId) {
        onSuperseded()
      }
    }
  } catch {
    channel = null
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== LOCK_KEY) return
    const lock = readLock()
    if (lock?.scope === scope && lock.tabId !== tabId) {
      onSuperseded()
    }
  }
  window.addEventListener("storage", onStorage)

  const interval = setInterval(() => {
    const lock = readLock()
    if (lock?.scope === scope && lock.tabId !== tabId) {
      onSuperseded()
      return
    }
    writeLock(scope, tabId)
  }, HEARTBEAT_MS)

  return () => {
    clearInterval(interval)
    window.removeEventListener("storage", onStorage)
    if (channel) channel.close()
  }
}

export function releaseTabLock(scope: TabScope, tabId: string) {
  const lock = readLock()
  if (lock?.scope === scope && lock.tabId === tabId) {
    localStorage.removeItem(LOCK_KEY)
  }
}
