import type { AxiosRequestConfig, AxiosResponse } from "axios"

export type Id = string | number

export type QueryParams = Record<string, unknown>

export type Payload = Record<string, unknown> | FormData

export type RequestConfig = AxiosRequestConfig

/** `new URLSearchParams(obj).toString()`, which stringifies non-string values. */
export function toQueryString(params: object = {}): string {
  return new URLSearchParams(params as Record<string, string>).toString()
}

/** Standard backend envelope: `{ status, message, data }`. */
export interface ApiResponse<T = unknown> {
  status?: number | boolean | string
  success?: boolean
  message?: string
  data?: T
  errors?: unknown
  [key: string]: unknown
}

export type BlobResponse = AxiosResponse<Blob>

/**
 * Rejection shape produced by the response interceptor. Fields from the backend
 * error body are spread in, so extra keys may be present.
 */
export interface ApiError {
  status?: number
  message: string
  code?: string
  errors?: unknown
  retryAfter?: unknown
  [key: string]: unknown
}

export type PermissionAction = "can_view" | "can_create" | "can_edit" | "can_delete"

export type PermissionAccess = Record<PermissionAction, boolean>

export type PermissionMap = Record<string, PermissionAccess>

export interface AdminSession {
  id?: Id
  admin_id?: Id
  email?: string
  name?: string
  full_name?: string
  role?: string
  role_code?: string
  roleCode?: string
  permissionMap?: PermissionMap
  [key: string]: unknown
}

export interface CustomerUser {
  id?: Id
  user_id?: Id
  email?: string
  mobile?: string
  name?: string
  [key: string]: unknown
}
