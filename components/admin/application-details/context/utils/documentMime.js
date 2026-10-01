/**
 * Infer MIME type from an explicit fileFormat or URL heuristics.
 * Pure helper — no React.
 */
export function detectMimeType(url, fileFormat = null) {
  if (fileFormat && fileFormat !== 'null' && fileFormat !== 'undefined') {
    return fileFormat;
  }
  if (url) {
    const u = url.toLowerCase();
    if (u.match(/\.(jpg|jpeg)(\?|$)/)) return 'image/jpeg';
    if (u.match(/\.png(\?|$)/)) return 'image/png';
    if (u.match(/\.webp(\?|$)/)) return 'image/webp';
    if (u.match(/\.pdf(\?|$)/)) return 'application/pdf';
    if (u.includes('/image/upload/')) return 'image/jpeg';
    if (u.includes('/raw/upload/') && u.match(/\.pdf/)) return 'application/pdf';
    if (u.includes('/video/upload/')) return 'video/mp4';
  }
  return null;
}
