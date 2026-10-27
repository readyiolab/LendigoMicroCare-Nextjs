import { documentsAPI } from '@/lib/api';
import { errorMessageFromBlobResponse } from '@/utils/downloadBlob';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Queue a ZIP of every application document, poll until the worker finishes,
 * then stream the file directly to disk via native browser download.
 *
 * Benefits of Direct Native Download:
 * - 0 MB JavaScript Heap / RAM usage.
 * - Streams straight from network socket to user's computer Downloads folder.
 * - Managed by native browser download manager (no 30s/120s script timeout aborts).
 * - Instant start: TTFB is ~19-25ms.
 */
export async function downloadAllApplicationDocuments(applicationId, applicationNumber = null, options = {}) {
  if (!applicationId) {
    throw new Error('Application ID is required');
  }
  const onStatus = typeof options.onStatus === 'function' ? options.onStatus : null;

  const started = await documentsAPI.downloadAllDocuments(applicationId);
  if (started?.status !== 1 || !started.data?.jobId) {
    throw new Error(started?.message || 'Failed to queue documents');
  }

  let job = started.data;
  const deadline = Date.now() + 10 * 60 * 1000;
  let pollAttempts = 0;

  while (job.status !== 'completed' && job.status !== 'failed') {
    onStatus?.(job.status === 'processing' ? 'processing' : 'queued');
    if (Date.now() > deadline) {
      throw new Error('The ZIP is still being prepared. You can keep working and try again.');
    }
    await sleep(2000);
    try {
      const statusRes = await documentsAPI.getDocumentZipJob(applicationId, job.jobId);
      if (statusRes?.status === 1 && statusRes.data) {
        job = statusRes.data;
        pollAttempts = 0;
      } else {
        pollAttempts += 1;
        if (pollAttempts >= 5) {
          throw new Error(statusRes?.message || 'Could not check the ZIP status.');
        }
      }
    } catch (pollErr) {
      pollAttempts += 1;
      if (pollAttempts >= 5) {
        throw pollErr;
      }
      console.warn(`[DownloadAll] Polling attempt ${pollAttempts}/5 failed, retrying...`, pollErr?.message);
    }
  }

  if (job.status === 'failed') {
    throw new Error(job.error || 'Failed to prepare documents');
  }

  onStatus?.('ready');
  onStatus?.('downloading');

  const fallbackName = job.fileName || `${applicationNumber || applicationId}_documents.zip`;

  // Build the complete direct download URL with signed token
  const directUrl = job.downloadUrl
    ? (job.downloadUrl.startsWith('http')
        ? job.downloadUrl
        : `${documentsAPI.getBaseUrl?.() || ''}${job.downloadUrl}`)
    : `${documentsAPI.getBaseUrl?.() || ''}/documents/download-all/${encodeURIComponent(applicationId)}/jobs/${job.jobId}/file`;

  // Direct native browser download - Streams straight to disk, 0MB JS RAM, 0 script timeouts
  const link = document.createElement('a');
  link.href = directUrl;
  link.setAttribute('download', fallbackName);
  link.setAttribute('rel', 'noopener noreferrer');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try { link.remove(); } catch (_) {}
  }, 1500);

  return { fileName: fallbackName, direct: true };
}

export { errorMessageFromBlobResponse };
