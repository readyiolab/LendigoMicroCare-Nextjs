import { documentsAPI } from '@/lib/api';
import {
  downloadBlob,
  filenameFromContentDisposition,
  errorMessageFromBlobResponse,
} from '@/utils/downloadBlob';

/**
 * Download all application documents as a single ZIP folder archive.
 * Bank statement PDFs are packed as original bytes (password protection intact).
 */
export async function downloadAllApplicationDocuments(applicationId, applicationNumber = null) {
  if (!applicationId) {
    throw new Error('Application ID is required');
  }

  const response = await documentsAPI.downloadAllDocuments(applicationId);
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

  const fallbackName = `${applicationNumber || applicationId}_documents.zip`;
  const fileName = filenameFromContentDisposition(
    response?.headers?.['content-disposition'],
    fallbackName
  );

  downloadBlob(dataBlob, fileName, 'application/zip');
  return { fileName };
}

export { errorMessageFromBlobResponse };
