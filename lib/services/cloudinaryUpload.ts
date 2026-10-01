/**
 * Direct S3 upload: browser to AWS S3 via presigned POST (default).
 * Server only issues a short-lived presign URL; file bytes never hit EC2.
 *
 * Flow:
 * 1. GET /upload/presign (small JSON, auth only)
 * 2. Optional image compression
 * 3. POST multipart form directly to S3
 *
 * Requires bucket CORS; run on backend: npm run s3:cors
 * Fallback via API only if NEXT_PUBLIC_UPLOAD_VIA_BACKEND=true
 */
import apiClient from "../api/config"
import imageCompression, { type Options as CompressionOptions } from "browser-image-compression"
import type { ApiResponse } from "../api/types"

/** Direct S3 is default. Set NEXT_PUBLIC_UPLOAD_VIA_BACKEND=true to proxy through API (legacy). */
const USE_BACKEND_PROXY = process.env.NEXT_PUBLIC_UPLOAD_VIA_BACKEND === "true"

export const UPLOAD_CATEGORIES = {
  selfie: "selfies",
  document: "documents",
  bankStatement: "bank-statements",
  residenceProof: "residence-proofs",
  esignDocument: "esign-documents",
  repayment: "repayments",
  videoDeclaration: "video-declarations",
  salarySlip: "salary-slips",
  callRecording: "call-recordings",
} as const

/** Must match fintech-backend/config/uploadValidation.js */
export const UPLOAD_MAX_BYTES: Record<string, number> = {
  "video-declarations": 100 * 1024 * 1024,
  selfies: 10 * 1024 * 1024,
  documents: 10 * 1024 * 1024,
  "bank-statements": 15 * 1024 * 1024,
  "residence-proofs": 10 * 1024 * 1024,
  "esign-documents": 10 * 1024 * 1024,
  "signed-agreements": 10 * 1024 * 1024,
  repayments: 10 * 1024 * 1024,
  "salary-slips": 10 * 1024 * 1024,
  "call-recordings": 20 * 1024 * 1024,
}

export type UploadPhase = "optimizing" | "uploading"

export interface UploadResult {
  url: string
  publicId: string
  fileFormat: string
  originalFilename: string
}

export interface UploadOptions {
  folder?: string
  category?: string
  compress?: boolean
  compressionOptions?: Partial<CompressionOptions>
  onPhase?: (phase: UploadPhase) => void
  onProgress?: (percent: number) => void
  signal?: AbortSignal
  resourceType?: string
  targetUserId?: string | number | null
}

interface HttpLikeError {
  message?: string
  name?: string
  response?: { status?: number; data?: { message?: string } }
}

function assertUploadSize(file: Blob, category: string) {
  const maxBytes = UPLOAD_MAX_BYTES[category] || 10 * 1024 * 1024
  if (file?.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024))
    throw new Error(`File is too large. Maximum allowed size is ${maxMb} MB.`)
  }
}

function mapUploadError(caught: unknown, category: string) {
  const err = caught as HttpLikeError | null
  const maxBytes = UPLOAD_MAX_BYTES[category] || 10 * 1024 * 1024
  const maxMb = Math.round(maxBytes / (1024 * 1024))
  const status = err?.response?.status
  if (status === 413) {
    return new Error(
      `File too large (max ${maxMb} MB). Ask admin to set Nginx client_max_body_size to at least 50m on the API server.`
    )
  }
  if (status === 400 && err?.response?.data?.message) {
    return new Error(err.response.data.message)
  }
  if (!err?.response && /network error|timeout/i.test(String(err?.message || ""))) {
    return new Error(
      `Upload failed (network). Each file must be under ${maxMb} MB. For direct S3 uploads, ensure bucket CORS is configured (backend: npm run s3:cors).`
    )
  }
  return caught
}

export const UPLOAD_FOLDERS: Record<string, string> = {
  selfie: "lendigo-microcare/selfies",
  document: "lendigo-microcare/documents",
  bankStatement: "lendigo-microcare/bank-statements",
  residenceProof: "lendigo-microcare/residence-proofs",
  esignDocument: "lendigo-microcare/esign-documents",
  repayment: "lendigo-microcare/repayments",
  videoDeclaration: "lendigo-microcare/video-declarations",
  salarySlip: "lendigo-microcare/salary-slips",
}

function resolveCategory(folderOrCategory: string | null | undefined): string | null {
  if (!folderOrCategory) return null
  const values: string[] = Object.values(UPLOAD_CATEGORIES)
  if (values.includes(folderOrCategory)) return folderOrCategory

  if (UPLOAD_FOLDERS[folderOrCategory]) {
    return resolveCategory(UPLOAD_FOLDERS[folderOrCategory])
  }

  const normalized = String(folderOrCategory).replace(/^\/+|\/+$/g, "")
  const last = normalized.split("/").pop()
  if (last && values.includes(last)) return last

  return null
}

function resolveContentType(file: File, resourceType: string | undefined, category: string) {
  if (category === "video-declarations" || resourceType === "video") {
    const type = (file?.type || "").split(";")[0].trim().toLowerCase()
    if (type && type.startsWith("video/")) return type
    const ext = String(file?.name || "").toLowerCase()
    if (ext.endsWith(".mp4") || ext.endsWith(".mov")) return "video/mp4"
    if (ext.endsWith(".webm")) return "video/webm"
    return "video/webm"
  }
  if (file?.type && file.type !== "text/plain") return file.type
  if (resourceType === "video") return "video/mp4"
  if (resourceType === "raw") return "application/pdf"
  return "application/octet-stream"
}

interface PresignedUpload {
  uploadUrl?: string
  fields?: Record<string, string | Blob | null | undefined>
  url: string
  key: string
}

async function getPresignedUpload(
  category: string,
  fileName: string,
  contentType: string,
  extraParams: Record<string, unknown> = {}
): Promise<PresignedUpload> {
  const response = await apiClient.get<ApiResponse<PresignedUpload>>("/upload/presign", {
    params: { category, fileName, contentType, ...extraParams },
  })

  if (!response?.data) {
    throw new Error(response?.message || "Failed to get S3 upload URL")
  }

  return response.data
}

export function getOptimizedUrl(url: unknown, options: { width?: number | string } = {}) {
  if (!url || typeof url !== "string") return ""
  const trimmed = url.trim()
  if (!trimmed) return ""

  const width = Number(options.width) || 0
  // Cloudinary delivery URLs support on-the-fly resize; S3 signed URLs do not.
  if (width > 0 && /res\.cloudinary\.com|cloudinary\.com\/.*\/image\/upload\//i.test(trimmed)) {
    if (trimmed.includes("/image/upload/")) {
      return trimmed.replace("/image/upload/", `/image/upload/c_limit,w_${width},q_auto,f_auto/`)
    }
  }
  return trimmed
}

export class UploadAbortedError extends Error {
  constructor(message = "Upload cancelled") {
    super(message)
    this.name = "UploadAbortedError"
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new UploadAbortedError()
  }
}

function shouldCompressImage(file: File, options: Partial<CompressionOptions> = {}) {
  if (!file?.type?.startsWith("image/")) return false
  const maxSizeMB = Number(options.maxSizeMB) || 1
  return file.size > maxSizeMB * 1024 * 1024
}

async function compressImage(file: File, options: Partial<CompressionOptions> = {}): Promise<File> {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type,
    ...options,
  }

  try {
    return await imageCompression(file, defaultOptions)
  } catch (error) {
    console.warn("Image compression failed, uploading original:", error)
    return file
  }
}

function parseS3ErrorBody(xmlText: string) {
  if (!xmlText || typeof xmlText !== "string") return ""
  const code = xmlText.match(/<Code>([^<]+)<\/Code>/i)?.[1]
  const message = xmlText.match(/<Message>([^<]+)<\/Message>/i)?.[1]
  if (code && message) return `${code}: ${message}`
  return xmlText.slice(0, 200)
}

function postToS3(
  uploadUrl: string,
  fields: PresignedUpload["fields"],
  file: File,
  { onProgress, signal }: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {}
) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadAbortedError())
      return
    }

    const formData = new FormData()
    Object.entries(fields || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value)
      }
    })
    // Avoid a second Content-Type on the file part (common cause of S3 400 on presigned POST)
    const fileBody = file instanceof Blob ? file : new Blob([file], { type: "application/octet-stream" })
    formData.append("file", fileBody, file.name || "upload")

    const xhr = new XMLHttpRequest()
    xhr.open("POST", uploadUrl)

    const abort = () => {
      xhr.abort()
    }
    if (signal) {
      signal.addEventListener("abort", abort, { once: true })
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      signal?.removeEventListener("abort", abort)
      if (xhr.status === 204 || (xhr.status >= 200 && xhr.status < 300)) {
        resolve()
        return
      }
      const detail = parseS3ErrorBody(xhr.responseText)
      const hint =
        xhr.status === 400 && /ACL|AccessControl/i.test(detail)
          ? " Set AWS_S3_DISABLE_ACL=true in backend .env or use VITE_UPLOAD_VIA_BACKEND=true."
          : xhr.status === 400
            ? " Try VITE_UPLOAD_VIA_BACKEND=true in frontend .env (upload via API)."
            : ""
      reject(new Error(`S3 upload failed (${xhr.status})${detail ? `: ${detail}` : ""}${hint}`))
    }

    xhr.onerror = () => {
      signal?.removeEventListener("abort", abort)
      reject(
        new Error(
          "Upload failed — could not reach the storage server. " +
            "This is usually caused by: (1) S3 bucket CORS not configured — run npm run s3:cors on the backend server, " +
            "or (2) S3 Object ACL rejection — add AWS_S3_DISABLE_ACL=true to backend .env and restart the server. " +
            "Alternatively set VITE_UPLOAD_VIA_BACKEND=true in frontend .env to upload via the API server instead."
        )
      )
    }

    xhr.onabort = () => {
      signal?.removeEventListener("abort", abort)
      reject(new UploadAbortedError())
    }

    xhr.send(formData)
  })
}

interface UploadResultBody {
  url?: string
  publicId?: string
  key?: string
  fileFormat?: string
}

async function uploadViaBackend(file: File, category: string, options: UploadOptions): Promise<UploadResult> {
  const { onProgress, targetUserId } = options
  assertUploadSize(file, category)

  let fileToUpload = file
  if (category === "video-declarations") {
    const rawType = (file?.type || "").split(";")[0].trim().toLowerCase()
    const name = String(file?.name || "").toLowerCase()
    const isMp4 = rawType === "video/mp4" || name.endsWith(".mp4")
    const properType = isMp4 ? "video/mp4" : "video/webm"
    const properName = `video_declaration.${isMp4 ? "mp4" : "webm"}`
    fileToUpload = new File([file], properName, { type: properType })
  }

  const formData = new FormData()
  formData.append("file", fileToUpload, fileToUpload.name || "upload")

  const params: Record<string, unknown> = { category }
  if (targetUserId) params.targetUserId = targetUserId

  try {
    const response = await apiClient.post<ApiResponse<UploadResultBody>>("/upload/file", formData, {
      params,
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000,
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    })

    if (response?.status !== 1 || !response?.data?.url) {
      throw new Error(response?.message || "Upload failed")
    }

    return {
      url: response.data.url,
      publicId: (response.data.publicId || response.data.key) as string,
      fileFormat: response.data.fileFormat || fileToUpload.type,
      originalFilename: fileToUpload.name,
    }
  } catch (err) {
    throw mapUploadError(err, category)
  }
}

async function uploadViaPresigned(file: File, category: string, options: UploadOptions): Promise<UploadResult> {
  const { resourceType = "auto", onProgress, targetUserId, signal } = options

  throwIfAborted(signal)
  const contentType = resolveContentType(file, resourceType, category)
  const fileName = file.name || "upload"
  const extraParams = targetUserId ? { targetUserId } : {}

  const presigned = await getPresignedUpload(category, fileName, contentType, extraParams)
  throwIfAborted(signal)

  if (!presigned?.uploadUrl || !presigned?.fields) {
    throw new Error("Invalid presigned upload response from server")
  }

  await postToS3(presigned.uploadUrl, presigned.fields, file, { onProgress, signal })

  return {
    url: presigned.url,
    publicId: presigned.key,
    fileFormat: contentType,
    originalFilename: fileName,
  }
}

export async function uploadToS3(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const { folder, category: categoryOption, compress = true, compressionOptions = {}, onPhase, signal, ...rest } =
    options

  const category = categoryOption || resolveCategory(folder)
  if (!category) {
    throw new Error("Upload category or folder is required")
  }

  throwIfAborted(signal)
  assertUploadSize(file, category)

  let fileToUpload = file
  if (file.type?.startsWith("image/") && compress && shouldCompressImage(file, compressionOptions)) {
    onPhase?.("optimizing")
    fileToUpload = await compressImage(file, compressionOptions)
    throwIfAborted(signal)
  }

  onPhase?.("uploading")
  const uploadOptions: UploadOptions = { ...rest, compress: false, signal }

  if (USE_BACKEND_PROXY) {
    return uploadViaBackend(fileToUpload, category, uploadOptions)
  }

  try {
    return await uploadViaPresigned(fileToUpload, category, uploadOptions)
  } catch (caught) {
    const presignErr = caught as HttpLikeError | null
    // If direct S3 upload fails with a network/CORS error and the signal was not aborted,
    // fall back transparently to backend proxy upload so the user is not blocked.
    if (caught instanceof UploadAbortedError || presignErr?.name === "UploadAbortedError" || signal?.aborted) {
      throw caught
    }
    const isNetworkOrCors = /CORS|blocked|network|Failed to fetch|NetworkError/i.test(presignErr?.message || "")
    if (isNetworkOrCors) {
      console.warn("[Upload] Direct S3 failed, falling back to backend proxy:", presignErr?.message)
      return uploadViaBackend(fileToUpload, category, uploadOptions)
    }
    throw caught
  }
}

export const uploadToCloudinary = uploadToS3

export default uploadToS3
