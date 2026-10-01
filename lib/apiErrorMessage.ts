const TECHNICAL_MESSAGE =
  /^(Request failed with status code \d+|AxiosError:.*|Network Error|timeout of \d+ms exceeded|Authentication failed|An error occurred|\[object Object\])$/i

const IS_UUID_OR_HEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[0-9a-f]{16,}$/i

const STATUS_MESSAGES: Record<number, string> = {
  400: "Please check your input and try again.",
  401: "Incorrect email or password. Please try again.",
  403: "You do not have permission to perform this action.",
  404: "We could not find what you were looking for.",
  409: "This record already exists.",
  429: "Too many attempts. Please wait a few minutes and try again.",
  500: "Something went wrong on our side. Please try again in a moment.",
  503: "Service is temporarily unavailable. Please try again shortly.",
}

const METADATA_KEYS = new Set([
  "request_id",
  "requestId",
  "result_code",
  "resultCode",
  "client_ref_num",
  "code",
  "status",
  "http_status",
  "existingApplication",
  "trace_id",
])

type MessageLike = { msg?: unknown; message?: unknown }

/** Loose error shape accepted from axios errors, interceptor rejections or plain objects. */
export interface ErrorLike {
  status?: unknown
  code?: unknown
  message?: unknown
  errors?: unknown
  retryAfter?: unknown
  config?: { url?: string }
  response?: {
    status?: number
    data?: unknown
    headers?: Record<string, unknown> | unknown
    config?: { url?: string }
  }
  [key: string]: unknown
}

export function isUserFriendlyMessage(str: unknown): str is string {
  if (typeof str !== "string") return false
  const s = str.trim()
  if (!s) return false
  if (s.startsWith("<") || s.includes("<!DOCTYPE") || s.includes("<html>")) return false
  if (IS_UUID_OR_HEX.test(s)) return false
  if (TECHNICAL_MESSAGE.test(s)) return false
  return true
}

function firstValidationMessage(errors: unknown): string {
  if (!errors) return ""
  if (Array.isArray(errors)) {
    const item = errors.find((e: unknown) => {
      const m = e as MessageLike | null
      const msg = m?.msg || m?.message || (typeof e === "string" ? e : "")
      return isUserFriendlyMessage(msg)
    }) as string | MessageLike | undefined
    if (!item) return ""
    return typeof item === "string" ? item : String(item.msg || item.message || "")
  }
  if (typeof errors === "object") {
    for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
      if (METADATA_KEYS.has(key)) continue
      if (Array.isArray(value)) {
        const nested = firstValidationMessage(value)
        if (nested) return nested
      } else if (value && typeof value === "object") {
        const msg = (value as MessageLike).msg || (value as MessageLike).message
        if (isUserFriendlyMessage(msg)) return msg
      } else if (isUserFriendlyMessage(value)) {
        return value
      }
    }
  }
  return ""
}

const STAFF_URL_PATTERNS = [
  {
    testUrl: /bank\/verify|digitap\/bank|digio\/bank/i,
    status: 400,
    message: "Bank check failed. Confirm account number and IFSC, then tap Verify bank (₹1) again.",
  },
]

const STAFF_MESSAGE_PATTERNS = [
  {
    test: /openrouter|status 402|requires more credits|payment required/i,
    message: "AI service is unavailable. Use Run credit check at the top of the page instead.",
  },
]

function matchStaffError(err: ErrorLike, message: string, status: unknown): string | null {
  const url = String(err?.config?.url || err?.response?.config?.url || "")
  const onAdminSite = typeof window !== "undefined" && window.location.pathname.startsWith("/admin")

  if (/access token required/i.test(message) && onAdminSite) {
    return "Could not verify admin access. Please try again or sign in again."
  }

  for (const rule of STAFF_URL_PATTERNS) {
    if (rule.status === status && rule.testUrl.test(url)) {
      return rule.message
    }
  }

  for (const rule of STAFF_MESSAGE_PATTERNS) {
    if (rule.test.test(message)) {
      return rule.message
    }
  }

  return null
}

function formatRateLimit(err: ErrorLike) {
  const headers = err?.response?.headers as Record<string, unknown> | undefined
  const retryAfter = err?.retryAfter ?? headers?.["retry-after"]
  if (!retryAfter) return ""
  const seconds = parseInt(String(retryAfter).replace(/\D/g, ""), 10)
  if (!Number.isFinite(seconds) || seconds <= 0) return ""
  const minutes = Math.ceil(seconds / 60)
  return `Too many attempts. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} and try again.`
}

/**
 * Turn API / axios errors into a short, user-friendly string.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!err) return fallback
  if (typeof err === "string") return isUserFriendlyMessage(err) ? err.trim() : fallback

  const e = err as ErrorLike
  const responseData = e.response?.data as { message?: unknown; errors?: unknown } | string | undefined
  const dataObject = typeof responseData === "object" && responseData !== null ? responseData : undefined

  const status = e.status ?? e.response?.status ?? (typeof e.code === "number" ? e.code : undefined)

  const rateLimitMsg = formatRateLimit(e)
  if (rateLimitMsg) return rateLimitMsg

  const serverMsg = String(
    dataObject?.message ??
      (typeof responseData === "string" ? responseData : "") ??
      (typeof e.message === "string" && !TECHNICAL_MESSAGE.test(e.message) ? e.message : "") ??
      ""
  ).trim()

  const isGenericValidation = /^(validation failed|validation error|invalid input|invalid data)$/i.test(serverMsg)

  if (serverMsg && isUserFriendlyMessage(serverMsg) && !isGenericValidation) {
    if (/too many requests/i.test(serverMsg)) {
      return STATUS_MESSAGES[429]
    }
    const staffMsg = matchStaffError(e, serverMsg, status)
    if (staffMsg) return staffMsg
    return serverMsg
  }

  const validationMsg = firstValidationMessage(e.errors ?? dataObject?.errors)
  if (validationMsg) {
    return validationMsg
  }

  if (serverMsg && isUserFriendlyMessage(serverMsg)) {
    const staffMsg = matchStaffError(e, serverMsg, status)
    if (staffMsg) return staffMsg
    return serverMsg
  }

  const rawMessage = String(e.message || "").trim()
  const staffMsg = matchStaffError(e, rawMessage, status)
  if (staffMsg) return staffMsg

  const statusMessage = status ? (STATUS_MESSAGES as Record<string, string>)[String(status)] : undefined
  if (statusMessage) {
    return statusMessage
  }

  return fallback
}

const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

export function isStrictEmail(value: unknown) {
  const email = String(value || "").trim()
  if (!email || email.length > 254) return false
  if (email.includes("..")) return false
  return STRICT_EMAIL_REGEX.test(email)
}

export function validateEmail(value: unknown, { required = true }: { required?: boolean } = {}) {
  const email = String(value || "").trim()
  if (!email) {
    return required ? "Please enter your email address." : null
  }
  if (!isStrictEmail(email)) {
    return "Please enter a valid email address."
  }
  return null
}

export function validateRequired(value: unknown, label: string) {
  if (String(value || "").trim()) return null
  return `Please enter your ${label}.`
}

export function validateIndianMobile(value: unknown, { required = false }: { required?: boolean } = {}) {
  const digits = String(value || "").replace(/\D/g, "")
  if (!digits) {
    return required ? "Please enter a 10-digit mobile number." : null
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return "Please enter a valid 10-digit mobile number."
  }
  return null
}

export function validatePassword(
  value: unknown,
  { minLength = 8, label = "password" }: { minLength?: number; label?: string } = {}
) {
  const password = String(value || "")
  if (!password) return `Please enter your ${label}.`
  if (password.length < minLength) {
    return `${label.charAt(0).toUpperCase() + label.slice(1)} must be at least ${minLength} characters.`
  }
  return null
}
