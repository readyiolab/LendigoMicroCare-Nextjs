import { documentsAPI } from '@/lib/api';
import {
  downloadBlob,
  filenameFromContentDisposition,
  errorMessageFromBlobResponse,
} from '@/utils/downloadBlob';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Queue a ZIP of every application document, poll until the worker finishes,
 * then save the file. Leaving the page does not cancel the job.
 */
export async function downloadAllApplicationDocuments(applicationId, applicationNumber = null, options = {}) {
  if (!applicationId) {
    throw new Error('Application ID is required');
  }
  const onStatus = typeof options.onStatus === 'function' ? options.onStatus : null;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

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

  const triggerDirectDownload = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fallbackName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try { link.remove(); } catch (_) {}
    }, 1500);
  };

  const directUrl = job.downloadUrl
    ? (job.downloadUrl.startsWith('http')
        ? job.downloadUrl
        : `${documentsAPI.getBaseUrl?.() || ''}${job.downloadUrl}`)
    : `${documentsAPI.getBaseUrl?.() || ''}/documents/download-all/${encodeURIComponent(applicationId)}/jobs/${job.jobId}/file`;

  try {
    const token = job.downloadUrl?.includes('token=')
      ? new URLSearchParams(job.downloadUrl.split('?')[1]).get('token')
      : null;

    const response = await documentsAPI.downloadDocumentZipFile(
      applicationId,
      job.jobId,
      (event) => {
        if (event.total > 0) {
          onProgress?.({
            loaded: event.loaded,
            total: event.total,
            percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
          });
        }
      },
      token
    );
    const dataBlob = response?.data ?? response;

    if (dataBlob instanceof Blob && dataBlob.type && dataBlob.type.includes('json')) {
      const text = await dataBlob.text();
      let message = 'Failed to download documents';
      try {
        message = JSON.parse(text).message || message;
      } catch {
        /* keep default */
      }
      throw new Error(message);
    }

    const fileName = filenameFromContentDisposition(
      response?.headers?.['content-disposition'],
      fallbackName
    );

    downloadBlob(dataBlob, fileName, 'application/zip');
    return { fileName };
  } catch (downloadErr) {
    // If backend returned a definitive 4xx HTTP client error (403, 404, 409, 410), propagate the actual error
    if (downloadErr.response?.status && downloadErr.response.status >= 400 && downloadErr.response.status < 500) {
      const specificMsg = await errorMessageFromBlobResponse(downloadErr, 'Failed to download documents');
      throw new Error(specificMsg);
    }
    console.warn('[DownloadAll] In-memory blob download encountered error, triggering direct browser download fallback:', downloadErr);
    triggerDirectDownload(directUrl);
    return { fileName: fallbackName, fallback: true };
  }
}

export { errorMessageFromBlobResponse };
