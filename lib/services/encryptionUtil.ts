/**
 * AES-256-GCM wire encryption; matches backend utils/payloadEncryption.js.
 * Uses Web Crypto. Overhead is about 1-3ms per response in the browser.
 */

const KEY_ENV = process.env.NEXT_PUBLIC_PAYLOAD_ENCRYPTION_KEY

let cryptoKeyPromise: Promise<CryptoKey> | null = null

async function getCryptoKey(): Promise<CryptoKey | null> {
  if (!KEY_ENV) return null
  if (!cryptoKeyPromise) {
    const encoded = new TextEncoder().encode(KEY_ENV)
    cryptoKeyPromise = crypto.subtle
      .digest("SHA-256", encoded)
      .then((hash) => crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]))
  }
  return cryptoKeyPromise
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array) {
  const bin = Array.from(new Uint8Array(bytes), (b) => String.fromCharCode(b)).join("")
  return btoa(bin)
}

function base64ToBytes(b64: string) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** GCM wire format from API: ivB64:authTagB64:cipherB64 */
export function isGcmWirePayload(value: unknown): boolean {
  if (typeof value !== "string" || !value.includes(":")) return false
  const parts = value.split(":")
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

/** Legacy CryptoJS / crypto-es salted format */
export function isLegacyCryptoJsPayload(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("U2FsdGVkX1")
}

export function isEncryptedWireString(value: unknown): value is string {
  return isGcmWirePayload(value) || isLegacyCryptoJsPayload(value)
}

export async function encryptPayload<T>(payload: T): Promise<T | string> {
  if (payload === undefined || payload === null) return payload
  const key = await getCryptoKey()
  if (!key) return payload
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify(payload))
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain)
  const cipherBytes = new Uint8Array(cipherBuf)
  const tagLen = 16
  const ciphertext = cipherBytes.slice(0, cipherBytes.length - tagLen)
  const authTag = cipherBytes.slice(cipherBytes.length - tagLen)
  return `${bytesToBase64(iv)}:${bytesToBase64(authTag)}:${bytesToBase64(ciphertext)}`
}

export async function decryptPayload(ciphertext: string): Promise<unknown> {
  if (!ciphertext || !KEY_ENV) return ciphertext

  if (isLegacyCryptoJsPayload(ciphertext)) {
    const { default: CryptoES } = await import("crypto-es")
    const bytes = CryptoES.AES.decrypt(ciphertext, KEY_ENV)
    const decryptedString = bytes.toString(CryptoES.enc.Utf8)
    if (!decryptedString) throw new Error("Malformed legacy encrypted payload")
    return JSON.parse(decryptedString)
  }

  if (!isGcmWirePayload(ciphertext)) {
    throw new Error("Unrecognized encrypted payload format")
  }

  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(":")
  const key = await getCryptoKey()
  if (!key) return ciphertext
  const iv = base64ToBytes(ivB64)
  const authTag = base64ToBytes(authTagB64)
  const encrypted = base64ToBytes(encryptedB64)
  const combined = new Uint8Array(encrypted.length + authTag.length)
  combined.set(encrypted)
  combined.set(authTag, encrypted.length)

  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined)
  const json = new TextDecoder().decode(plainBuf)
  if (!json) throw new Error("Malformed encrypted payload")
  return JSON.parse(json)
}
