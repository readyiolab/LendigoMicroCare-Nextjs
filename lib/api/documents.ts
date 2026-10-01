import apiClient from './config';
import type { Id, Payload, QueryParams } from './types';

export const documentsAPI = {
  // Upload Bank Statement (legacy - via multer)
  uploadBankStatement: (formData: FormData, targetUserId: Id | null = null) =>
    apiClient.post(`/documents/bank-statement/upload${targetUserId ? `?targetUserId=${targetUserId}` : ''}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Save Bank Statement (direct upload - URL from Cloudinary)
  saveBankStatement: (data: Payload, targetUserId: Id | null = null) =>
    apiClient.post('/documents/bank-statement/save', {
      ...data,
      ...(targetUserId != null ? { targetUserId } : {}),
    }),

  // Get Bank Statement Status
  getBankStatementStatus: (params?: QueryParams) => apiClient.get('/documents/bank-statement/status', { params }),

  // Customer Digitap AA (bank connect)
  initiateAa: (data: Payload, targetUserId: Id | null = null) =>
    apiClient.post('/documents/aa/initiate', {
      ...data,
      ...(targetUserId != null ? { targetUserId } : {}),
    }),
  getAaStatus: (params?: QueryParams) => apiClient.get('/documents/aa/status', { params }),

  // Upload Residence Proof (legacy - via multer)
  uploadResidenceProof: (formData: FormData, targetUserId: Id | null = null) =>
    apiClient.post(`/documents/residence-proof/upload${targetUserId ? `?targetUserId=${targetUserId}` : ''}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Save Residence Proof (direct upload - URLs from Cloudinary)
  saveResidenceProof: (data: Payload, targetUserId: Id | null = null) =>
    apiClient.post('/documents/residence-proof/save', {
      ...data,
      ...(targetUserId != null ? { targetUserId } : {}),
    }),

  // Get Residence Proof Status
  getResidenceProofStatus: (params?: QueryParams) => apiClient.get('/documents/residence-proof/status', { params }),

  // Delete Residence Proof Document
  deleteResidenceProof: (documentId: Id) =>
    apiClient.delete(`/documents/residence-proof/${documentId}`),

  // Add Reference
  addReference: (data: Payload) => apiClient.post('/documents/reference', data),

  // Get References
  getReferences: (params?: QueryParams) => apiClient.get('/documents/reference', { params }),

  // Update Reference
  updateReference: (referenceId: Id, data: Payload) =>
    apiClient.put(`/documents/reference/${referenceId}`, data),

  // Delete Reference
  deleteReference: (referenceId: Id) =>
    apiClient.delete(`/documents/reference/${referenceId}`),

  // Add Disbursal Bank Details
  addBankDetails: (data: Payload) => apiClient.post('/documents/bank-details', data),

  // Get Disbursal Bank Details
  getBankDetails: (params?: QueryParams) => apiClient.get('/documents/bank-details', { params }),

  // Upload Salary Slip (legacy - via multer)
  uploadSalarySlip: (formData: FormData, targetUserId: Id | null = null) =>
    apiClient.post(`/documents/salary-slip/upload${targetUserId ? `?targetUserId=${targetUserId}` : ''}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Save Salary Slip (direct upload - URL from Cloudinary)
  saveSalarySlip: (data: Payload, targetUserId: Id | null = null) =>
    apiClient.post('/documents/salary-slip/save', {
      ...data,
      ...(targetUserId != null ? { targetUserId } : {}),
    }),

  getSalarySlips: (applicationId: Id, targetUserId: Id | null = null) => {
    const params = new URLSearchParams();
    if (applicationId) params.append('loanApplicationId', String(applicationId));
    if (targetUserId) params.append('targetUserId', String(targetUserId));
    const queryString = params.toString();
    return apiClient.get(`/documents/salary-slips${queryString ? `?${queryString}` : ''}`);
  },

  // Download document with proper headers (proxy through backend)
  getDownloadUrl: (documentType: string, applicationNumber: Id, originalUrl: string, fileFormat: string | null = null) => {
    const baseUrl = apiClient.defaults.baseURL || '/api/v1';
    const encodedUrl = encodeURIComponent(originalUrl);
    const formatParam = fileFormat ? `&format=${encodeURIComponent(fileFormat)}` : '';
    return `${baseUrl}/documents/download/${documentType}/${applicationNumber}?url=${encodedUrl}${formatParam}`;
  },

  // Generate CAM PDF
  generateCAM: (applicationId: Id) => 
    apiClient.get(`/documents/cam/${applicationId}`, { responseType: 'blob' }),
    
  // Generate Sanction Letter PDF
  generateSanctionLetter: (applicationId: Id) =>
    apiClient.get(`/documents/sanction-letter/${applicationId}`, { responseType: 'blob' }),

  // Download all application documents as a ZIP (original bytes)
  downloadAllDocuments: (applicationId: Id) =>
    apiClient.get(`/documents/download-all/${encodeURIComponent(applicationId)}`, {
      responseType: 'blob',
      timeout: 300000,
    }),

  // Get Document Vault (Signed Agreements, NOC, etc.)
  getDocumentVault: () => apiClient.get('/documents/vault'),
};
