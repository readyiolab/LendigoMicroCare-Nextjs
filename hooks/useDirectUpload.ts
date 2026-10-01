import { useState, useCallback, useRef } from "react"
import {
  uploadToS3,
  UPLOAD_FOLDERS,
  UPLOAD_CATEGORIES,
  UploadAbortedError,
  type UploadOptions,
  type UploadResult,
} from "@/lib/services/cloudinaryUpload"

export type DirectUploadPhase = "idle" | "optimizing" | "uploading" | "uploaded" | "error"

type HookUploadOptions = Omit<UploadOptions, "signal" | "onPhase" | "onProgress">

const isAbort = (err: unknown) =>
  err instanceof UploadAbortedError || (err as { name?: string } | null)?.name === "UploadAbortedError"

const messageOf = (err: unknown) => (err as { message?: string } | null)?.message || "Upload failed"

/**
 * React hook for direct S3 uploads with progress tracking and cancellation.
 */
export function useDirectUpload() {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<DirectUploadPhase>("idle")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setProgress(0)
    setPhase("idle")
    setUploading(false)
    setError(null)
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setUploading(false)
    setPhase("idle")
  }, [])

  const upload = useCallback(async (file: File, options: HookUploadOptions = {}): Promise<UploadResult | null> => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setUploading(true)
      setError(null)
      setProgress(0)
      setPhase("uploading")

      const result = await uploadToS3(file, {
        ...options,
        signal: controller.signal,
        onPhase: (nextPhase) => {
          if (!controller.signal.aborted) setPhase(nextPhase)
        },
        onProgress: (percent) => {
          if (!controller.signal.aborted) {
            setProgress(percent)
          }
        },
      })

      if (!controller.signal.aborted) {
        setProgress(100)
        setPhase("uploaded")
      }

      return result
    } catch (err) {
      if (isAbort(err)) {
        return null
      }
      const errorMessage = messageOf(err)
      if (!controller.signal.aborted) {
        setError(errorMessage)
        setPhase("error")
      }
      throw err
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      if (!controller.signal.aborted) {
        setUploading(false)
      }
    }
  }, [])

  const uploadMultiple = useCallback(
    async (files: FileList | File[] | null | undefined, options: HookUploadOptions = {}): Promise<UploadResult[]> => {
      const list = Array.from(files || [])
      if (list.length === 0) return []

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const fileProgress: number[] = new Array(list.length).fill(0)

      const reportOverall = () => {
        const overall = Math.round(fileProgress.reduce((sum, value) => sum + value, 0) / list.length)
        setProgress(overall)
      }

      try {
        setUploading(true)
        setError(null)
        setProgress(0)
        setPhase("uploading")

        const results = await Promise.all(
          list.map((file, index) =>
            uploadToS3(file, {
              ...options,
              signal: controller.signal,
              onProgress: (percent) => {
                if (controller.signal.aborted) return
                fileProgress[index] = percent
                reportOverall()
              },
            })
          )
        )

        if (!controller.signal.aborted) {
          setProgress(100)
          setPhase("uploaded")
        }
        return results
      } catch (err) {
        if (isAbort(err)) {
          return []
        }
        setError(messageOf(err))
        setPhase("error")
        throw err
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        if (!controller.signal.aborted) {
          setUploading(false)
        }
      }
    },
    []
  )

  return {
    upload,
    uploadMultiple,
    progress,
    phase,
    uploading,
    error,
    reset,
    cancel,
  }
}

export { UPLOAD_FOLDERS, UPLOAD_CATEGORIES, UploadAbortedError }

export default useDirectUpload
