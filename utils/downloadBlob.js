/**
 * Trigger a browser download from a Blob or ArrayBuffer response body.
 */
export function downloadBlob(data, fileName, mimeType = 'application/octet-stream') {
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Guess filename from Content-Disposition header, with fallback.
 */
export function filenameFromContentDisposition(header, fallback) {
  if (!header) return fallback;
  const match = String(header).match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1].replace(/"/g, '').trim());
  } catch {
    return match[1].replace(/"/g, '').trim() || fallback;
  }
}

/**
 * Parse an error message from a blob API response (JSON error bodies).
 */
export async function errorMessageFromBlobResponse(error, fallback = 'Download failed') {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      return json.message || json.error || fallback;
    } catch {
      return fallback;
    }
  }
  return error?.response?.data?.message || error?.message || fallback;
}
