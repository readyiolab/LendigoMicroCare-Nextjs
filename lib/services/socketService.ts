import type { Socket } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- socket.io listeners receive arbitrary server payloads
type SocketListener = (...args: any[]) => void

type IoFactory = typeof import("socket.io-client").io

let ioModulePromise: Promise<IoFactory> | null = null
const getIo = async (): Promise<IoFactory> => {
  if (!ioModulePromise) {
    ioModulePromise = import("socket.io-client").then((m) => m.io || m.default)
  }
  return ioModulePromise
}

export interface SocketConnectOptions {
  adminId?: string | number | null
  roleCode?: string | null
  userId?: string | number | null
}

class SocketService {
  socket: Socket | null = null
  isConnected = false
  listeners = new Map<string, SocketListener[]>()

  async connect(options: SocketConnectOptions = {}) {
    const { adminId, roleCode, userId } = options
    if (this.socket) {
      this.socket.disconnect()
    }

    const query: Record<string, string> = {}
    if (adminId != null && adminId !== "") query.adminId = String(adminId)
    if (roleCode != null && roleCode !== "") query.roleCode = String(roleCode)
    if (userId != null && userId !== "") query.userId = String(userId)

    try {
      const io = await getIo()
      const socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        query,
      })
      this.socket = socket

      socket.on("connect", () => {
        this.isConnected = true
        console.log("[SocketService] Connected to server")
      })

      socket.on("disconnect", () => {
        this.isConnected = false
        console.log("[SocketService] Disconnected from server")
      })

      socket.on("error", (err: unknown) => {
        console.error("[SocketService] Connection error:", err)
      })

      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => socket.on(event, cb))
      })
    } catch (err) {
      console.error("[SocketService] Failed to initialize socket.io:", err)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  on(event: string, callback: SocketListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)

    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event: string, callback: SocketListener) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }

    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  emit(event: string, data?: unknown) {
    if (this.socket) {
      this.socket.emit(event, data)
    } else {
      console.warn("[SocketService] Attempted to emit before connection")
    }
  }
}

const socketService = new SocketService()
export default socketService
