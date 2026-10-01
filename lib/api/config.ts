import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios"
import { decryptPayload, isEncryptedWireString } from "../services/encryptionUtil"
import { getApiErrorMessage } from "../apiErrorMessage"
import { notifyAdminSessionCleared, notifyCustomerSessionCleared } from "../services/authEvents"
import {
  getBrePolicyVaultToken,
  clearBrePolicyVaultToken,
  urlNeedsBrePolicyVault,
} from "../services/brePolicyVault"
import type { ApiResponse } from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1"

type ErrorBody = Record<string, unknown> & {
  code?: unknown
  message?: unknown
  errors?: unknown
  data?: unknown
  retryAfter?: unknown
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

/**
 * The response interceptor unwraps `response.data` (and decrypts it), so every
 * method resolves with the body rather than an AxiosResponse. Blob requests are
 * the exception and resolve with the full AxiosResponse.
 */
export interface ApiClient {
  <T = ApiResponse>(config: AxiosRequestConfig): Promise<T>
  request<T = ApiResponse>(config: AxiosRequestConfig): Promise<T>
  get<T = ApiResponse>(url: string, config?: AxiosRequestConfig): Promise<T>
  delete<T = ApiResponse>(url: string, config?: AxiosRequestConfig): Promise<T>
  head<T = ApiResponse>(url: string, config?: AxiosRequestConfig): Promise<T>
  options<T = ApiResponse>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = ApiResponse>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T = ApiResponse>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  patch<T = ApiResponse>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  defaults: AxiosInstance["defaults"]
  interceptors: AxiosInstance["interceptors"]
}

const isPasswordlessSelfieFlow = () =>
  typeof window !== "undefined" && window.location.pathname.startsWith("/verify-selfie")

const isMagicSelfieRequest = (url = "") =>
  url.includes("/kyc/selfie/magic-verify") || url.includes("/kyc/selfie/magic-upload")

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers["Content-Type"]
      }
    }
    const url = config.url || ""
    if (urlNeedsBrePolicyVault(url)) {
      const vaultToken = getBrePolicyVaultToken()
      if (vaultToken) {
        config.headers.set("X-BRE-Policy-Vault", vaultToken)
      }
    }
    return config
  },
  (error: unknown) => Promise.reject(error)
)

const isSessionSuperseded = (errorData: ErrorBody = {}) => {
  const nested = errorData?.errors as { code?: unknown } | undefined
  return (
    errorData?.code === "SESSION_SUPERSEDED" ||
    nested?.code === "SESSION_SUPERSEDED" ||
    /logged in elsewhere/i.test(String(errorData?.message || ""))
  )
}

const redirectToLogin = (isAdmin: boolean, reason = "session_expired") => {
  const query = reason === "elsewhere" ? "?reason=elsewhere" : ""
  if (isAdmin) {
    localStorage.removeItem("adminData")
    localStorage.removeItem("adminRole")
    notifyAdminSessionCleared(reason)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload must drop all in-memory session state
    window.location.href = `/admin/login${query}`
  } else {
    notifyCustomerSessionCleared(reason)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload must drop all in-memory session state
    window.location.href = `/login${query}`
  }
}

const isOnAuthPage = () =>
  window.location.pathname.includes("/login") ||
  window.location.pathname.includes("/register") ||
  window.location.pathname.startsWith("/verify-selfie")

let isRefreshing = false
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = []

const processQueue = (error: unknown, token: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

async function decryptBody(body: ErrorBody, label: string): Promise<ErrorBody> {
  if (body && typeof body.data === "string" && isEncryptedWireString(body.data)) {
    try {
      return (await decryptPayload(body.data)) as ErrorBody
    } catch (err) {
      console.error(label, err)
    }
  }
  return body
}

axiosInstance.interceptors.response.use(
  // Resolves with the unwrapped body; see ApiClient.
  (async (response) => {
    if (response.config.responseType === "blob") {
      return response
    }
    let responseData: unknown = response.data
    const envelope = responseData as ErrorBody | null

    if (envelope && typeof envelope.data === "string" && isEncryptedWireString(envelope.data)) {
      try {
        responseData = await decryptPayload(envelope.data)
      } catch (err) {
        console.error("[API] Failed to decrypt response payload:", err)
      }
    }

    return responseData
  }) as Parameters<AxiosInstance["interceptors"]["response"]["use"]>[0],
  async (error: AxiosError<ErrorBody>) => {
    const originalRequest = error.config as RetriableConfig | undefined
    if (!originalRequest) {
      return Promise.reject({ message: error?.message || "Request failed. Please try again." })
    }

    const url = originalRequest.url
    const isAuthEndpoint =
      url?.includes("/auth/login") ||
      url?.includes("/auth/register") ||
      url?.includes("/auth/logout") ||
      url?.includes("/auth/token/refresh") ||
      url?.includes("/admin/auth/login") ||
      url?.includes("/admin/auth/logout") ||
      url?.includes("/admin/auth/token/refresh")

    if (isMagicSelfieRequest(url) || isPasswordlessSelfieFlow()) {
      const errorData = (error.response?.data || error) as ErrorBody
      return Promise.reject({
        ...errorData,
        message: getApiErrorMessage(
          { ...errorData, response: error.response },
          "Request failed. Please try again."
        ),
        errors: errorData.errors || {},
      })
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const errorData = error.response?.data || {}
      const onAdminSite =
        typeof window !== "undefined" && window.location.pathname.startsWith("/admin")
      const isAdminRequest =
        onAdminSite || (url?.includes("/admin/") && !url?.includes("/admin/auth/login")) || false

      if (isSessionSuperseded(errorData)) {
        if (!isOnAuthPage()) {
          redirectToLogin(isAdminRequest, "elsewhere")
        }
        return Promise.reject(errorData)
      }

      console.warn(`[API] 401 Unauthorized for: ${url}. Attempting token refresh...`)

      if (isRefreshing) {
        console.log(`[API] Already refreshing, queuing request: ${url}`)
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            console.log(`[API] Retrying queued request: ${url}`)
            return axiosInstance(originalRequest)
          })
          .catch((err: unknown) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshPath = isAdminRequest ? "/admin/auth/token/refresh" : "/auth/token/refresh"

        console.log(`[API] Calling refresh token endpoint: ${refreshPath}`)
        await axios.post(`${API_BASE_URL}${refreshPath}`, {}, { withCredentials: true })

        console.log("[API] Refresh successful. Retrying original request...")
        processQueue(null, null)
        isRefreshing = false

        return axiosInstance(originalRequest)
      } catch (caught) {
        const refreshError = caught as AxiosError<ErrorBody>
        const status = refreshError.response?.status || "unknown"
        const refreshMsg = refreshError.response?.data?.message || refreshError.message || ""
        const refreshData = refreshError.response?.data || {}
        console.error(`[API] Token refresh failed (${status}):`, refreshMsg)

        processQueue(refreshError, null)
        isRefreshing = false

        const isSessionProbe = url?.includes("/auth/me") || url?.includes("/admin/profile")

        if (isSessionSuperseded(refreshData)) {
          if (!isOnAuthPage()) {
            redirectToLogin(isAdminRequest, "elsewhere")
          }
          return Promise.reject(refreshData)
        }

        if (isSessionProbe) {
          return Promise.reject(refreshError)
        }

        const isAdminPage = window.location.pathname.startsWith("/admin")
        const isAdminApiRequest = url?.includes("/admin/") && !url?.includes("/admin/auth/login")

        if (isAdminApiRequest && !isAdminPage) {
          localStorage.removeItem("adminData")
          localStorage.removeItem("adminRole")
          notifyAdminSessionCleared()
          return Promise.reject(refreshError)
        }

        const refreshStatus = refreshError.response?.status
        const isAuthExpiration = refreshStatus === 401 || refreshStatus === 403

        // Never redirect on 429, 5xx or network disconnects.
        if (isAuthExpiration && !isOnAuthPage()) {
          redirectToLogin(isAdminPage, "session_expired")
        }

        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401 && isAuthEndpoint) {
      let errorData: ErrorBody = error.response?.data || {}
      if (errorData && typeof errorData.data === "string" && isEncryptedWireString(errorData.data)) {
        try {
          errorData = (await decryptPayload(errorData.data)) as ErrorBody
        } catch (decryptErr) {
          console.error("[API] Failed to decrypt auth error payload:", decryptErr)
          errorData = { status: 0, message: "" }
        }
      }
      const isAdminLogin = url?.includes("/admin/auth/login")
      const fallback = isAdminLogin
        ? "Incorrect email or password. Please try again."
        : "Your session has expired. Please sign in again."
      return Promise.reject({
        ...errorData,
        status: 401,
        message: getApiErrorMessage({ ...errorData, response: error.response }, fallback),
        errors: errorData.errors || {},
      })
    }

    if (error.response?.status === 403) {
      const errorData = error.response?.data || {}
      if (errorData.code === "BRE_VAULT_REQUIRED") {
        clearBrePolicyVaultToken()
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("bre-vault-locked"))
        }
        return Promise.reject({
          ...errorData,
          message: errorData.message || "Vault password required",
        })
      }
      const msg = String(errorData.message || "")
      const isAdminPage = window.location.pathname.startsWith("/admin")
      const isAdminRequest = url?.includes("/admin/")

      if (isAdminRequest && !isAdminPage) {
        localStorage.removeItem("adminData")
        localStorage.removeItem("adminRole")
        notifyAdminSessionCleared()
        return Promise.reject(errorData)
      }

      if (isAdminPage) {
        // Role-limited action (e.g. super_admin only): do not log the whole admin out.
        if (/super admin/i.test(msg)) {
          return Promise.reject(errorData)
        }

        const isSessionFailure =
          /admin access required/i.test(msg) ||
          /authentication required/i.test(msg) ||
          /access token required/i.test(msg) ||
          /admin account not found/i.test(msg) ||
          /admin account is not active/i.test(msg)

        if (isSessionFailure) {
          console.warn("[API] Admin session invalid:", msg)
          localStorage.removeItem("adminData")
          localStorage.removeItem("adminRole")
          notifyAdminSessionCleared()
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload must drop all in-memory session state
          window.location.href = "/admin/login?error=forbidden"
          return Promise.reject(errorData)
        }

        return Promise.reject(errorData)
      }
    }

    const errorData = await decryptBody(
      (error.response?.data || error) as unknown as ErrorBody,
      "[API] Failed to decrypt error payload:"
    )

    if (error.response?.status === 429) {
      const retryAfter =
        error.response.data?.retryAfter || error.response.headers?.["retry-after"] || "some time"
      return Promise.reject({
        ...errorData,
        status: 429,
        message: getApiErrorMessage(
          { ...errorData, retryAfter, response: error.response },
          `Too many requests. Please wait ${retryAfter} before trying again.`
        ),
        retryAfter,
      })
    }

    return Promise.reject({
      ...errorData,
      status: error.response?.status,
      message: getApiErrorMessage({ ...errorData, response: error.response }),
      errors: errorData.errors || {},
    })
  }
)

const apiClient = axiosInstance as unknown as ApiClient

export default apiClient
