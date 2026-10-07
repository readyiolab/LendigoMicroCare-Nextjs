import { adminAPI, documentsAPI } from '@/lib/api';
import { detectMimeType } from '../utils/documentMime';
import {
  downloadAllApplicationDocuments,
  errorMessageFromBlobResponse,
} from '@/utils/downloadAllDocuments';

/**
 * Document download/view/upload/remarks handlers for application detail.
 * Behavior preserved from ApplicationContext extraction.
 */
export function useApplicationDocuments({
  applicationId,
  loanApp,
  data,
  esignDocs,
  sectionsLoadedRef,
  fetchDocumentsSection,
  fetchApplication,
  setData,
  setError,
  setMessage,
  setUpdating,
  setUploading,
  setUploadingKey,
  setUploadingType,
  setDownloadingDoc,
  setDownloadingCAM,
  setActiveTab,
  onUpdate,
}) {
  const handleDownload = async (docType, url = null, appNumber = null) => {
    try {
      setDownloadingDoc(docType);
      setError('');
      const response = await adminAPI.getGenericDocument(docType, appNumber || applicationId, url);
      if (response) {
        const dataBlob = response.data || response;
        const contentType = dataBlob.type || response.headers?.['content-type'] || 'application/pdf';

        if (contentType.includes('json') || (dataBlob instanceof Blob && dataBlob.type.includes('json'))) {
          try {
            const text = typeof dataBlob.text === 'function' ? await dataBlob.text() : JSON.stringify(dataBlob);
            const json = JSON.parse(text);
            setError(json.message || 'Failed to download document');
            return;
          } catch {
            /* fall through */
          }
        }

        const blob = dataBlob instanceof Blob ? dataBlob : new Blob([dataBlob], { type: contentType });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${docType}_${appNumber || applicationId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error('Download error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to download document');
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDownloadAll = async () => {
    const appRef = loanApp?.id || applicationId;
    const appNumber = loanApp?.application_number || applicationId;
    try {
      setDownloadingDoc('download_all');
      setError('');
      await downloadAllApplicationDocuments(appRef, appNumber);
      setMessage('All documents downloaded');
    } catch (err) {
      console.error('Download-all error:', err);
      const message = await errorMessageFromBlobResponse(err, 'Failed to download all documents');
      setError(message);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDownloadCAM = async () => {
    try {
      setDownloadingCAM(true);
      setError('');
      const response = await documentsAPI.generateCAM(applicationId);
      const blob = new Blob([response.data || response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CAM_${applicationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download CAM');
    } finally {
      setDownloadingCAM(false);
    }
  };

  const handleViewFile = async (docType, url, appNumber = null, fileFormat = null) => {
    if (!url) return;

    if (url.startsWith('blob:')) {
      setError('Document preview expired. Refresh the application to load the saved Cloudinary file.');
      return;
    }

    const mime = detectMimeType(url, fileFormat) || fileFormat || 'application/pdf';

    if (mime.startsWith('image/') || mime.startsWith('video/')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      setUploadingKey('view');
      const response = await adminAPI.getGenericDocument(
        docType,
        appNumber || applicationId,
        url,
        mime
      );
      const payload = response?.data ?? response;
      const blob =
        payload instanceof Blob
          ? payload
          : new Blob([payload], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const tab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!tab) {
        setError('Pop-up blocked. Allow pop-ups to view this document.');
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch (err) {
      console.error('View failed', err);
      setError(err?.message || 'Could not open document. Please try again.');
    } finally {
      setUploadingKey(null);
      setUploading(false);
    }
  };

  const handleSalarySlipUpload = async (file, monthTag) => {
    if (!file) return;
    setUploadingKey('salary');
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', loanApp?.user_id);
      formData.append('monthTag', monthTag || `slip_${Date.now()}`);

      const response = await adminAPI.uploadSalarySlip(applicationId, formData);
      if (response.status === 1) {
        const uploaded = response.data || {};
        const optimistic = {
          id: uploaded.id || `temp_${Date.now()}`,
          file_url: uploaded.file_url || null,
          document_url: uploaded.file_url || null,
          month_tag: uploaded.month_tag || monthTag || `slip_${Date.now()}`,
          file_format: uploaded.file_format || file.type || 'application/pdf',
          original_filename: file.name || null,
          created_at: uploaded.created_at || new Date().toISOString(),
          verification_status: 'pending',
          uploaded_by: 'admin',
        };
        setData((prev) => {
          if (!prev) return prev;
          const prevList = Array.isArray(prev.salarySlips) ? prev.salarySlips : [];
          const withoutDup = prevList.filter(
            (s) => s.id !== optimistic.id && String(s.month_tag || '') !== String(optimistic.month_tag || '')
          );
          return {
            ...prev,
            salarySlips: [optimistic, ...withoutDup],
          };
        });
        setMessage('Employment proof uploaded successfully');
        await fetchDocumentsSection(true);
      } else {
        setError(response.message || 'Failed to upload employment proof');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
      setUploading(false);
    }
  };

  const handleEsignUpload = async (file, docType) => {
    if (!file) return;
    setUploading(true);
    setUploadingType(docType);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('docType', docType);
      formData.append('file', file);

      const response = await adminAPI.uploadEsignDocument(applicationId, formData, docType);
      if (response.status === 1) {
        setMessage(`${docType === 'loan_agreement' ? 'Signed agreement' : docType.replace('_', ' ')} uploaded successfully`);
        const payload = response.data || {};
        const signedUrl = payload.signed_document_url;
        setData((prev) => {
          if (!prev) return prev;
          const nextDoc = {
            id: payload.id,
            loan_application_id: applicationId,
            document_type: payload.document_type || docType,
            signed_document_url: signedUrl,
            document_url: signedUrl,
            esign_status: payload.esign_status || 'signed',
            esign_provider: payload.esign_provider || (docType === 'loan_agreement' ? 'esign_direct' : undefined),
          };
          const prevDocs = Array.isArray(prev.esignDocs) ? prev.esignDocs : [];
          const others = prevDocs.filter((d) => d.document_type !== nextDoc.document_type);
          return {
            ...prev,
            application: prev.application
              ? {
                  ...prev.application,
                  ...(docType === 'loan_agreement'
                    ? {
                        esign_status: 'signed',
                        application_status: 'esign_completed',
                      }
                    : {}),
                }
              : prev.application,
            esignDocs: [...others, nextDoc],
          };
        });
        await fetchApplication(true, ['documents']);
        await fetchDocumentsSection(true);
      } else {
        setError(response.message || 'Failed to upload document');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadingType(null);
    }
  };

  const handleCompleteEsign = async () => {
    let existingAgreement = data?.esignDocs?.find((d) => d.document_type === 'loan_agreement')?.document_url
      || data?.esignDocs?.find((d) => d.document_type === 'loan_agreement')?.signed_document_url;
    let existingSanction = data?.esignDocs?.find((d) => d.document_type === 'sanction_letter')?.document_url
      || data?.esignDocs?.find((d) => d.document_type === 'sanction_letter')?.signed_document_url;

    if ((!existingAgreement || !existingSanction) && applicationId) {
      try {
        const resp = await adminAPI.getApplicationDocumentsSection(applicationId);
        const docs = resp?.data?.esignDocs || [];
        existingAgreement = docs.find((d) => d.document_type === 'loan_agreement')?.signed_document_url
          || docs.find((d) => d.document_type === 'loan_agreement')?.document_url
          || existingAgreement;
        existingSanction = docs.find((d) => d.document_type === 'sanction_letter')?.signed_document_url
          || docs.find((d) => d.document_type === 'sanction_letter')?.document_url
          || existingSanction;
      } catch {
        /* fall through */
      }
    }

    const agreementUrl = esignDocs.agreement || existingAgreement;
    const sanctionUrl = esignDocs.sanctionLetter || existingSanction;

    if (!agreementUrl || !sanctionUrl) {
      setError('Please upload both Sanction Letter and Loan Agreement files');
      return;
    }

    setUpdating(true);
    setError('');
    setMessage('');

    try {
      const payload = [
        { type: 'loan_agreement', url: agreementUrl },
        { type: 'sanction_letter', url: sanctionUrl },
      ];

      const response = await adminAPI.completeEsign(applicationId, payload);
      if (response.status === 1) {
        setMessage('E-Sign completed and Payment Initiated successfully!');
        fetchApplication(true);
        setActiveTab('disbursement');
        if (onUpdate) onUpdate();
      } else {
        setError(response.message || 'Failed to complete E-Sign');
      }
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleBankStatementUpload = async (file, pdfPassword = '') => {
    if (!file) return;
    setUploadingKey('bank');
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', loanApp?.user_id);
      if (pdfPassword) formData.append('statementPassword', pdfPassword);

      const response = await adminAPI.uploadBankStatement(applicationId, formData);
      if (response.status === 1) {
        const uploaded = response.data || {};
        const optimistic = {
          id: uploaded.id || `temp_${Date.now()}`,
          statement_url: uploaded.statement_url || null,
          file_format: uploaded.file_format || file.type || 'application/pdf',
          bank_name: uploaded.bank_name || 'Admin Uploaded',
          analysis_status: uploaded.analysis_status || 'completed',
          has_password: Boolean(uploaded.has_password || pdfPassword),
          statement_password: uploaded.statement_password ?? (pdfPassword || null),
          created_at: uploaded.created_at || new Date().toISOString(),
        };
        setData((prev) => {
          if (!prev) return prev;
          const prevList = Array.isArray(prev.bankStatements) ? prev.bankStatements : [];
          return {
            ...prev,
            bankStatements: [optimistic, ...prevList],
          };
        });
        setMessage('Bank statement uploaded successfully');
        await fetchDocumentsSection(true);
      } else {
        setError(response.message || 'Failed to upload bank statement');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
      setUploading(false);
    }
  };

  const handleUpdateBankStatementPassword = async (statementId, password) => {
    if (!statementId) return false;
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.updateBankStatementPassword(applicationId, statementId, {
        statementPassword: password,
      });
      if (response.status === 1) {
        const nextPwd = response.data?.statement_password ?? password ?? null;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            bankStatements: (prev.bankStatements || []).map((row) =>
              String(row.id) === String(statementId)
                ? {
                    ...row,
                    statement_password: nextPwd,
                    has_password: Boolean(nextPwd),
                  }
                : row
            ),
          };
        });
        setMessage('Bank statement password updated');
        return true;
      }
      setError(response.message || 'Failed to update password');
      return false;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update password');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleResidenceProofUpload = async (file, documentType = 'other') => {
    if (!file) return;
    setUploadingKey('residence');
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', loanApp?.user_id);
      formData.append('documentType', documentType);
      const response = await adminAPI.uploadResidenceProof(applicationId, formData);
      if (response.status === 1) {
        setMessage('Address proof uploaded successfully');
        await fetchDocumentsSection(true);
      } else {
        setError(response.message || 'Failed to upload address proof');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
      setUploading(false);
    }
  };

  const handleVideoDeclarationUpload = async (file) => {
    if (!file) return;
    setUploadingKey('video');
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', loanApp?.user_id);
      formData.append('targetUserId', loanApp?.user_id);
      const response = await adminAPI.uploadVideoDeclaration(applicationId, formData);
      if (response.status === 1) {
        const videoUrl = response.data?.video_url;
        setMessage('Video declaration uploaded successfully');
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            videoDeclaration: {
              ...(prev.videoDeclaration || {}),
              video_url: videoUrl || prev.videoDeclaration?.video_url,
              status: 'submitted',
            },
            application: prev.application
              ? {
                  ...prev.application,
                  video_declaration_url: videoUrl || prev.application.video_declaration_url,
                }
              : prev.application,
          };
        });
        await fetchApplication(true);
      } else {
        setError(response.message || 'Failed to upload video declaration');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
      setUploading(false);
    }
  };

  const handleOtherDocumentUpload = async (file, documentLabel = 'Other document') => {
    if (!file) return;
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
    const name = String(file.name || '').toLowerCase();
    const okExt = /\.(pdf|jpe?g|png)$/i.test(name);
    if (!allowed.has(file.type) && !okExt) {
      setError('Only PDF, JPG, JPEG, or PNG files are allowed for other documents');
      return;
    }
    setUploadingKey('other');
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', loanApp?.user_id);
      formData.append('documentLabel', documentLabel);
      const response = await adminAPI.uploadOtherDocument(applicationId, formData);
      if (response.status === 1) {
        setMessage('Other document uploaded successfully');
        await fetchDocumentsSection(true);
      } else {
        setError(response.message || 'Failed to upload document');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
      setUploading(false);
    }
  };

  const handleDeleteOtherDocument = async (documentId) => {
    if (!documentId) return;
    setUploadingKey('other');
    setUploading(true);
    setError('');
    try {
      const response = await adminAPI.deleteOtherDocument(applicationId, documentId);
      if (response.status === 1) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            otherDocuments: (prev.otherDocuments || []).filter(
              (d) => Number(d.id) !== Number(documentId)
            ),
          };
        });
        setMessage('Document deleted');
        await fetchDocumentsSection(true);
      } else {
        setError(response.message || 'Failed to delete document');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Delete failed');
    } finally {
      setUploadingKey(null);
      setUploading(false);
    }
  };

  const handleRenameOtherDocument = async (documentId, documentLabel) => {
    const label = String(documentLabel || '').trim();
    if (!documentId || !label) return false;
    setUploadingKey('other');
    setUploading(true);
    setError('');
    try {
      const response = await adminAPI.renameOtherDocument(applicationId, documentId, {
        documentLabel: label,
      });
      if (response.status === 1) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            otherDocuments: (prev.otherDocuments || []).map((d) =>
              Number(d.id) === Number(documentId) ? { ...d, document_label: label } : d
            ),
          };
        });
        setMessage('Document renamed');
        await fetchDocumentsSection(true);
        return true;
      }
      setError(response.message || 'Failed to rename document');
      return false;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Rename failed');
      return false;
    } finally {
      setUploadingKey(null);
      setUploading(false);
    }
  };

  const handleUpsertDocumentRemark = async ({ documentCategory, documentId, remark, remarkId }) => {
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.upsertDocumentRemark(applicationId, {
        documentCategory,
        documentId,
        remark,
        remarkId,
      });
      if (response.status === 1) {
        setMessage('Remark saved');
        await fetchDocumentsSection(true);
        return true;
      }
      setError(response.message || 'Failed to save remark');
      return false;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save remark');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDocumentRemark = async (remarkId) => {
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.deleteDocumentRemark(applicationId, remarkId);
      if (response.status === 1) {
        setMessage('Remark deleted');
        await fetchDocumentsSection(true);
      } else {
        setError(response.message || 'Failed to delete remark');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete remark');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddApplicationReference = async (payload) => {
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.addApplicationReference(applicationId, payload);
      if (response.status === 1) {
        const newId = response.data?.id;
        setData((prev) => {
          if (!prev) return prev;
          const nextRef = {
            id: newId,
            reference_name: payload.reference_name,
            reference_mobile: payload.reference_mobile,
            relationship: payload.relationship || null,
            reference_email: payload.reference_email || null,
            reference_type: payload.reference_type || 'personal',
            verification_status: 'pending',
          };
          return {
            ...prev,
            references: [...(prev.references || []), nextRef],
          };
        });
        setMessage('Reference added');
        return { ok: true };
      }
      const message = response.message || 'Failed to add reference';
      setError(message);
      return { ok: false, message };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to add reference';
      setError(message);
      return { ok: false, message };
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateApplicationReference = async (referenceId, payload) => {
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.updateApplicationReference(applicationId, referenceId, payload);
      if (response.status === 1) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            references: (prev.references || []).map((r) =>
              Number(r.id) === Number(referenceId) ? { ...r, ...payload } : r
            ),
          };
        });
        setMessage('Reference updated');
        return { ok: true };
      }
      const message = response.message || 'Failed to update reference';
      setError(message);
      return { ok: false, message };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update reference';
      setError(message);
      return { ok: false, message };
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteApplicationReference = async (referenceId) => {
    if (!window.confirm('Delete this reference?')) return false;
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.deleteApplicationReference(applicationId, referenceId);
      if (response.status === 1) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            references: (prev.references || []).filter((r) => Number(r.id) !== Number(referenceId)),
          };
        });
        setMessage('Reference deleted');
        return true;
      }
      setError(response.message || 'Failed to delete reference');
      return false;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete reference');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleLookupReferenceMobileName = async (referenceId) => {
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.lookupReferenceMobileName(applicationId, referenceId);
      if (response.status === 1) {
        const lookup = response.data || {};
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            references: (prev.references || []).map((r) =>
              Number(r.id) === Number(referenceId) ? { ...r, ...lookup } : r
            ),
          };
        });
        setMessage(response.message || 'Name check complete');
        return { ok: true, lookup };
      }
      const message = response.message || 'Name check failed';
      setError(message);
      return { ok: false, message };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Name check failed';
      setError(message);
      return { ok: false, message };
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateApplicantProfile = async (payload) => {
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.updateApplicantProfile(applicationId, payload);
      if (response.status === 1) {
        setMessage('Applicant details updated');
        await fetchApplication(true);
        return { ok: true };
      }
      const message = response.message || 'Failed to update applicant';
      setError(message);
      return { ok: false, message };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update applicant';
      setError(message);
      return { ok: false, message };
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePrimaryMobile = async (mobile) => {
    setUpdating(true);
    setError('');
    try {
      const response = await adminAPI.updatePrimaryMobile(applicationId, { mobile });
      if (response.status === 1) {
        setMessage(
          response.data?.unchanged
            ? 'Primary mobile already set'
            : 'Primary mobile updated (login + DigiLocker)'
        );
        await fetchApplication(true);
        return { ok: true, data: response.data };
      }
      const message = response.message || 'Failed to update primary mobile';
      setError(message);
      return { ok: false, message };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update primary mobile';
      setError(message);
      return { ok: false, message };
    } finally {
      setUpdating(false);
    }
  };

  return {
    handleDownload,
    handleDownloadAll,
    handleDownloadCAM,
    handleViewFile,
    handleSalarySlipUpload,
    handleEsignUpload,
    handleCompleteEsign,
    handleBankStatementUpload,
    handleUpdateBankStatementPassword,
    handleResidenceProofUpload,
    handleVideoDeclarationUpload,
    handleOtherDocumentUpload,
    handleDeleteOtherDocument,
    handleRenameOtherDocument,
    handleUpsertDocumentRemark,
    handleDeleteDocumentRemark,
    handleAddApplicationReference,
    handleUpdateApplicationReference,
    handleDeleteApplicationReference,
    handleLookupReferenceMobileName,
    handleUpdateApplicantProfile,
    handleUpdatePrimaryMobile,
  };
}
