"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import socketService from "@/lib/services/socketService"
import { useAdminAuth } from "./AdminAuthContext"
import { useAuth } from "./AuthContext"
import { X, Bell } from "lucide-react"

export interface ToastItem {
  id: number
  title: string
  message: string
}

export interface StatusUpdate {
  appNumber?: string
  newStatus: string
  [key: string]: unknown
}

export interface NotificationContextValue {
  notifications: unknown[]
  unreadCount: number
  applicationUpdate: StatusUpdate | null
  fetchNotifications: () => Promise<void>
  markAsRead: () => Promise<void>
  markAllAsRead: () => Promise<void>
  toast: (title: string, message: string, duration?: number) => void
  toasts: ToastItem[]
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { admin } = useAdminAuth()
  const { user } = useAuth()
  const [notifications] = useState<unknown[]>([])
  const [unreadCount] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [applicationUpdate, setApplicationUpdate] = useState<StatusUpdate | null>(null)

  const fetchNotifications = useCallback(async () => {}, [])
  const markAsRead = useCallback(async () => {}, [])
  const markAllAsRead = useCallback(async () => {}, [])

  const toast = useCallback((title: string, message: string, duration = 5000) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, title, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  useEffect(() => {
    if (admin?.id) {
      const adminRole = admin.role_code || admin.role
      socketService.connect({ adminId: admin.id, roleCode: adminRole })

      return () => {
        socketService.disconnect()
      }
    }

    if (user?.id) {
      socketService.connect({ userId: user.id })

      const handleStatusUpdate = (update: StatusUpdate) => {
        setApplicationUpdate(update)
        toast("Status Updated", `Your application ${update.appNumber} is now ${update.newStatus.replace(/_/g, " ")}`)
      }

      socketService.on("status_update", handleStatusUpdate)

      return () => {
        socketService.off("status_update", handleStatusUpdate)
        socketService.disconnect()
      }
    }
  }, [admin?.id, admin?.role, admin?.role_code, user?.id, toast])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      applicationUpdate,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      toast,
      toasts,
    }),
    [notifications, unreadCount, applicationUpdate, fetchNotifications, markAsRead, markAllAsRead, toast, toasts]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm pointer-events-none px-4 space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900 text-white shadow-2xl p-4 flex gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
          >
            <div className="bg-blue-600/20 p-2 h-fit flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.title}</p>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((toastItem) => toastItem.id !== t.id))}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
