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

  const started = await documentsAPI.downloadAllDocuments(applicationId);
  if (started?.status !== 1 || !started.data?.jobId) {
    throw new Error(started?.message || 'Failed to queue documents');
  }

  let job = started.data;
  const deadline = Date.now() + 10 * 60 * 1000;
  while (job.status !== 'completed' && job.status !== 'failed') {
    onStatus?.(job.status === 'processing' ? 'processing' : 'queued');
    if (Date.now() > deadline) {
      throw new Error('The ZIP is still being prepared. You can keep working and try again.');
    }
    await sleep(2000);
    const statusRes = await documentsAPI.getDocumentZipJob(applicationId, job.jobId);
    if (statusRes?.status !== 1 || !statusRes.data) {
      throw new Error(statusRes?.message || 'Could not check the ZIP');
    }
    job = statusRes.data;
  }

  if (job.status === 'failed') {
    throw new Error(job.error || 'Failed to prepare documents');
  }

  onStatus?.('ready');
  const response = await documentsAPI.downloadDocumentZipFile(applicationId, job.jobId);
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

  const fallbackName = job.fileName || `${applicationNumber || applicationId}_documents.zip`;
  const fileName = filenameFromContentDisposition(
    response?.headers?.['content-disposition'],
    fallbackName
  );

  downloadBlob(dataBlob, fileName, 'application/zip');
  return { fileName };
}

export { errorMessageFromBlobResponse };
