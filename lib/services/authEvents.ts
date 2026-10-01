/** Lightweight pub/sub so API interceptors can clear React auth state without circular imports. */
type SessionClearListener = (reason: string) => void

const adminSessionClearListeners = new Set<SessionClearListener>()
const customerSessionClearListeners = new Set<SessionClearListener>()

export function onAdminSessionCleared(listener: SessionClearListener) {
  adminSessionClearListeners.add(listener)
  return () => {
    adminSessionClearListeners.delete(listener)
  }
}

export function notifyAdminSessionCleared(reason = "session_expired") {
  adminSessionClearListeners.forEach((listener) => {
    try {
      listener(reason)
    } catch (err) {
      console.error("[authEvents] Admin session clear listener failed:", err)
    }
  })
}

export function onCustomerSessionCleared(listener: SessionClearListener) {
  customerSessionClearListeners.add(listener)
  return () => {
    customerSessionClearListeners.delete(listener)
  }
}

export function notifyCustomerSessionCleared(reason = "session_expired") {
  customerSessionClearListeners.forEach((listener) => {
    try {
      listener(reason)
    } catch (err) {
      console.error("[authEvents] Customer session clear listener failed:", err)
    }
  })
}
