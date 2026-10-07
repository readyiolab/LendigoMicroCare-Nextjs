import apiClient from './config';
import type { Id, Payload, QueryParams, RequestConfig } from './types';
import { toQueryString } from './types';

export interface RepaymentSubmission {
  loanId: Id;
  emiId?: Id;
  utr?: string;
  amount?: Id;
  screenshot?: Blob;
  screenshotUrl?: string;
}

export const loanAPI = {
  // Check Eligibility
  checkEligibility: (data: Payload) => apiClient.post('/loan/eligibility/check', data),

  // Get Dashboard Status
  getDashboardStatus: (params?: QueryParams) => apiClient.get('/loan/dashboard/status', { params }),

  // Get Loan Settings
  getSettings: () => apiClient.get('/loan/settings'),

  // Calculate Loan
  calculateLoan: (data: Payload) => apiClient.post('/loan/calculate', data),

  // Initialize Loan Application (Draft)
  initializeApplication: () => apiClient.post('/loan/initialize'),

  // Reloan: fresh Account Aggregator, then automatic submit
  startReloan: () => apiClient.post('/loan/reloan'),
  getReloanStatus: () => apiClient.get('/loan/reloan/status'),

  // Create Loan Application (Final Submit)
  createLoanApplication: (data: Payload) => apiClient.post('/loan/apply', data),

  // Get User's Loan Applications
  getApplications: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/loan/applications${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get Loan Application Details
  getApplicationDetails: (applicationId: Id) =>
    apiClient.get(`/loan/applications/${applicationId}`),

  // Submit Loan Application
  submitApplication: (applicationId: Id) =>
    apiClient.post(`/loan/applications/${applicationId}/submit`),

  getApplicationProgress: (applicationId: Id, targetUserId: Id | null = null) => {
    const params = targetUserId ? { targetUserId } : {};
    if (applicationId) {
      return apiClient.get(`/loan/applications/${applicationId}/progress`, { params });
    }
    return apiClient.get('/loan/progress', { params });
  },

  completeStep: (data: Payload) => apiClient.post('/loan/step/complete', data),

  // Repayment APIs
  getActiveRepaymentLoan: () => apiClient.get('/loan/repayment/active'),

  getRepaymentDetails: (loanId: Id, params: QueryParams = {}) =>
    apiClient.get(`/loan/repayment/${loanId}`, { params }),

  submitRepayment: (data: RepaymentSubmission) => {
    // data: { loanId, emiId, utr, screenshot (file) OR screenshotUrl }
    // Supports both legacy file upload and direct Cloudinary URL
    if (data.screenshotUrl) {
      // Direct upload flow — send URL as JSON
      return apiClient.post(`/loan/repayment/${data.loanId}/submit`, {
        emiId: data.emiId,
        utr: data.utr,
        amount: data.amount,
        screenshotUrl: data.screenshotUrl,
      });
    }
    // Legacy flow — send file via FormData
    const formData = new FormData();
    formData.append('emiId', String(data.emiId));
    formData.append('utr', String(data.utr));
    formData.append('screenshot', data.screenshot as Blob);
    if (data.amount) {
      formData.append('amount', String(data.amount));
    }

    return apiClient.post(`/loan/repayment/${data.loanId}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Prepayment / Foreclosure calculation
  calculatePrepayment: (loanId: Id, prepaymentDate: string | null = null) =>
    apiClient.post(`/loan/repayment/${loanId}/prepayment-calculate`, { prepaymentDate }),

  // ==========================================
  // STRICT LOAN JOURNEY APIs
  // ==========================================

  // Accept loan offer (customer)
  /** @deprecated Prefer offerAPI.acceptOfferWithUrl — video is required */
  acceptLoanOffer: (applicationId: Id, videoUrl: string) =>
    apiClient.post(`/loan/applications/${applicationId}/accept-offer`, { video_url: videoUrl }),

  // Upload video declaration (legacy - via multer)
  uploadVideoDeclaration: (applicationId: Id, videoFile: Blob) => {
    const formData = new FormData();
    formData.append('video', videoFile);
    return apiClient.post(`/loan/applications/${applicationId}/video-declaration`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Save video declaration (direct upload - URL from Cloudinary)
  saveVideoDeclaration: (applicationId: Id, videoUrl: string) =>
    apiClient.post(`/loan/applications/${applicationId}/video-declaration`, {
      videoUrl,
    }),

  // Get video declaration status (customer)
  getVideoDeclarationStatus: (applicationId: Id) =>
    apiClient.get(`/loan/applications/${applicationId}/video-declaration/status`),

  // Get re-application data (returning users)
  getReapplicationData: () => apiClient.get('/loan/reapply-data'),

  // Get company payment info (bank details + UPI for repayment)
  getCompanyPaymentInfo: () => apiClient.get('/loan/company-payment-info'),

  // ==========================================
  // NOTIFICATION APIs
  // ==========================================
  getNotifications: () => Promise.resolve({ status: 1, data: [] }),
  markNotificationRead: () => Promise.resolve({ status: 1, message: 'OK' }),

  // ==========================================
  // ADMIN ANALYTICS APIs
  // ==========================================
  getOperationsAnalytics: (params?: QueryParams, config: RequestConfig = {}) =>
    apiClient.get('/loan/admin/analytics/operations', { params, ...config }),
  getPortfolioSnapshot: (params?: QueryParams, config: RequestConfig = {}) =>
    apiClient.get('/loan/admin/analytics/portfolio', { params, ...config }),
  exportPortfolioCSV: (params?: QueryParams) => apiClient.get('/loan/admin/analytics/portfolio/export', { 
    params,
    responseType: 'blob' 
  }),
};

