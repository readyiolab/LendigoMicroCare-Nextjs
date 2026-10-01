import apiClient from './config';
import type { Id, Payload, QueryParams } from './types';

export const kycAPI = {
  // Get KYC Status
  getKYCStatus: (params?: QueryParams) => apiClient.get('/kyc/status', { params }),

  // Customer self-serve Digitap DigiLocker (Aadhaar + PAN)
  customerInitiateDigilocker: (applicationId: Id) =>
    apiClient.post('/kyc/digitap/customer-initiate', applicationId ? { applicationId } : {}),

  // Upload Selfie (legacy - via multer)
  uploadSelfie: (formData: FormData, targetUserId: Id | null = null) =>
    apiClient.post(`/kyc/selfie/upload${targetUserId ? `?targetUserId=${targetUserId}` : ''}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // Save Selfie (direct upload - URL from Cloudinary)
  saveSelfie: (data: Payload) =>
    apiClient.post('/kyc/selfie/save', data),

  // Get Selfie Status
  getSelfieStatus: (params?: QueryParams) => apiClient.get('/kyc/selfie/status', { params }),

  // Magic Link passwordless selfie verification
  magicVerify: (token: Id) => 
    apiClient.get(`/kyc/selfie/magic-verify?token=${token}`),

  // Magic Link passwordless selfie upload
  magicUploadSelfie: (formData: FormData) =>
    apiClient.post('/kyc/selfie/magic-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};
