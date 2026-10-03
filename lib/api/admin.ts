import apiClient from './config';
import type { Id, Payload, QueryParams, RequestConfig } from './types';
import { toQueryString } from './types';

export const adminAPI = {
  // ==========================================
  // ADMIN AUTHENTICATION
  // ==========================================
  adminRegister: (data: Payload) =>
    apiClient.post('/admin/auth/register', data),

  adminLogin: (data: Payload) =>
    apiClient.post('/admin/auth/login', data),

  adminLogout: () =>
    apiClient.post('/admin/auth/logout'),

  adminRefreshToken: () =>
    apiClient.post('/admin/auth/token/refresh', {}),

  // ==========================================
  // ADMIN DASHBOARD & MANAGEMENT
  // ==========================================
  // Get Dashboard Stats
  getDashboard: () => apiClient.get('/admin/dashboard'),

  // Get All Users
  getUsers: (params: QueryParams = {}, config: RequestConfig = {}) => {
    return apiClient.get('/admin/users', { params, ...config });
  },

  // Get User Details
  getUserDetails: (userId: Id) => apiClient.get(`/admin/users/${userId}`),
  getUserCompleteDetails: (userId: Id) => apiClient.get(`/admin/users/progress/${userId}`),

  // Update User Status
  updateUserStatus: (userId: Id, data: Payload) =>
    apiClient.patch(`/admin/users/${userId}/status`, data),

  // Get All Loan Applications
  getApplications: (params: QueryParams = {}, config: RequestConfig = {}) => {
    return apiClient.get('/admin/applications', { params, ...config });
  },

  getApplicationDetails: (applicationId: Id, params: QueryParams = {}) =>
    apiClient.get(`/admin/applications/${applicationId}`, { params }),

  getApplicationByToken: (token: Id) =>
    apiClient.get(`/admin/applications/by-token/${token}`),

  getApplicationProgress: (applicationId: Id) =>
    apiClient.get(`/admin/applications/${applicationId}/progress`),

  // Update Loan Status
  updateLoanStatus: (applicationId: Id, data: Payload) =>
    apiClient.patch(`/admin/applications/${applicationId}/status`, data),

  // Update UPI ID
  updateUPIId: (applicationId: Id, data: Payload) =>
    apiClient.patch(`/admin/applications/${applicationId}/upi`, data),

  // Staff bank edit that also works after e-sign / disbursal (not gated by the Digitap KYC lock)
  updateLoanBankDetails: (applicationId: Id, data: Payload) =>
    apiClient.patch(`/admin/applications/${applicationId}/bank-details`, data),

  runCreditDecision: async (applicationRef: Id, overrides: Payload | null = null) => {
    const response = await apiClient.post(
      `/credit-decision/${encodeURIComponent(applicationRef)}`,
      overrides || {}
    );
    return response;
  },

  getCreditApplicantFields: async (applicationRef: Id) => {
    const response = await apiClient.get(
      `/credit-decision/${encodeURIComponent(applicationRef)}/applicant-fields`
    );
    return response;
  },

  resumeCreditDecision: async (applicationRef: Id) => {
    const response = await apiClient.post(`/credit-decision/${encodeURIComponent(applicationRef)}/resume`);
    return response;
  },

  getCreditDecisionAaStatus: async (applicationRef: Id, { force = false }: { force?: boolean } = {}) => {
    const response = await apiClient.get(`/credit-decision/${encodeURIComponent(applicationRef)}/aa/status`, {
      params: force ? { force: 1, _t: Date.now() } : undefined,
    });
    return response;
  },

  getAaConfigStatus: async () => {
    const response = await apiClient.get('/credit-decision/aa/config');
    return response;
  },

  initiateAaConsent: async (applicationRef: Id, options: QueryParams = {}) => {
    const response = await apiClient.post(
      `/credit-decision/${encodeURIComponent(applicationRef)}/aa/initiate`,
      options
    );
    return response;
  },

  resendAaConsentEmail: async (applicationRef: Id) => {
    const response = await apiClient.post(
      `/credit-decision/${encodeURIComponent(applicationRef)}/aa/resend-email`
    );
    return response;
  },

  getLatestCreditDecision: async (applicationRef: Id, params: QueryParams = {}) => {
    const response = await apiClient.get(`/credit-decision/${encodeURIComponent(applicationRef)}/latest`, {
      params: { view: 'summary', ...params },
    });
    return response;
  },

  getCreditBureauSummary: async (applicationRef: Id) => {
    const response = await apiClient.get(
      `/credit-decision/${encodeURIComponent(applicationRef)}/bureau/summary`
    );
    return response;
  },

  getCreditBureauDetail: async (applicationRef: Id) => {
    const response = await apiClient.get(
      `/credit-decision/${encodeURIComponent(applicationRef)}/bureau/detail`
    );
    return response;
  },

  getCreditBureauPdfUrl: async (applicationRef: Id, reportId: Id) => {
    const response = await apiClient.get(
      `/credit-decision/${encodeURIComponent(applicationRef)}/bureau/pdf/${encodeURIComponent(reportId)}`
    );
    return response;
  },

  getCreditBankDataReport: async (applicationRef: Id, { force = false }: { force?: boolean } = {}) => {
    const response = await apiClient.get(
      `/credit-decision/${encodeURIComponent(applicationRef)}/bank-data/report`,
      { params: force ? { _t: Date.now() } : undefined }
    );
    return response;
  },

  // CRIF Test Tool — standalone live pull for admin testing
  crifTestLookup: (mobile: string) =>
    apiClient.post('/admin/bre/crif-test/lookup', { mobile }),

  crifTestPull: (formData: FormData) =>
    apiClient.post('/admin/bre/crif-test/pull', formData),

  // Initiate Disbursement (queues to disbursal sheet — does not invent UTR)
  initiateDisbursement: (applicationId: Id) =>
    apiClient.post(`/admin/applications/${applicationId}/disburse`),

  // Punch bank reference from application profile (requires registered e-mandate)
  punchDisbursalByApplication: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/punch-disbursal`, data),

  getDisbursalEligible: (params: QueryParams = {}) =>
    apiClient.get('/admin/disbursal-sheet/eligible', { params }),

  getDisbursalSheet: (params: QueryParams = {}) =>
    apiClient.get('/admin/disbursal-sheet', { params }),

  getDisbursalBatches: () =>
    apiClient.get('/admin/disbursal-sheet/batches'),

  moveToDisbursalSheet: (applicationIds: Id[]) =>
    apiClient.post('/admin/disbursal-sheet/move', { applicationIds }),

  exportDisbursalBatch: (batchId = 'latest') =>
    apiClient.get(`/admin/disbursal-sheet/${batchId}/export`, { responseType: 'blob' }),

  exportDisbursalMis: (params: QueryParams = {}) =>
    apiClient.get('/admin/disbursal-sheet/mis-export', { params, responseType: 'blob' }),

  punchDisbursal: (disbursementId: Id, data: Payload) =>
    apiClient.post(`/admin/disbursal-sheet/${disbursementId}/punch`, data),

  failDisbursal: (disbursementId: Id, data: Payload) =>
    apiClient.post(`/admin/disbursal-sheet/${disbursementId}/fail`, data),

  // Complete E-Sign
  completeEsign: (applicationId: Id, documentUrls: unknown) =>
    apiClient.post(`/admin/applications/${applicationId}/complete-esign`, { documentUrls }),

  verifyBankDetails: (applicationId: Id) =>
    apiClient.post(`/admin/applications/${applicationId}/verify-bank`),

  uploadSalarySlip: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/salary-slip`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  uploadEsignDocument: (applicationId: Id, formData: FormData, docType: string) =>
    apiClient.post(`/admin/applications/${applicationId}/esign-document?docType=${docType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  uploadBankStatement: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/bank-statement`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  updateBankStatementPassword: (applicationId: Id, statementId: Id, data: Payload) =>
    apiClient.patch(`/admin/applications/${applicationId}/bank-statement/${statementId}/password`, data),

  uploadResidenceProof: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/residence-proof`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadOtherDocument: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/other-document`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadVideoDeclaration: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/video-declaration`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteOtherDocument: (applicationId: Id, documentId: Id) =>
    apiClient.delete(`/admin/applications/${applicationId}/other-document/${documentId}`),

  renameOtherDocument: (applicationId: Id, documentId: Id, data: Payload) =>
    apiClient.patch(`/admin/applications/${applicationId}/other-document/${documentId}`, data),

  upsertDocumentRemark: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/document-remarks`, data),

  deleteDocumentRemark: (applicationId: Id, remarkId: Id) =>
    apiClient.delete(`/admin/applications/${applicationId}/document-remarks/${remarkId}`),

  addApplicationReference: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/references`, data),

  updateApplicationReference: (applicationId: Id, referenceId: Id, data: Payload) =>
    apiClient.put(`/admin/applications/${applicationId}/references/${referenceId}`, data),

  deleteApplicationReference: (applicationId: Id, referenceId: Id) =>
    apiClient.delete(`/admin/applications/${applicationId}/references/${referenceId}`),

  updateApplicantProfile: (applicationId: Id, data: Payload) =>
    apiClient.patch(`/admin/applications/${applicationId}/applicant-profile`, data),

  updatePrimaryMobile: (applicationId: Id, data: Payload) =>
    apiClient.patch(`/admin/applications/${applicationId}/primary-mobile`, data),

  getProfile: () => apiClient.get('/admin/profile'),

  // Repayment tracking
  getLoanRepayments: (applicationId: Id) =>
    apiClient.get(`/admin/applications/${applicationId}/repayments`),

  /** Loan account view: disbursement / interest / statement of account */
  getLoanAccountView: (applicationId: Id) =>
    apiClient.get(`/admin/applications/${applicationId}/loan-account-view`),

  /** Lazy sections for application detail tabs */
  getApplicationDocumentsSection: (applicationId: Id, options: QueryParams = {}) => {
    const bustCache = options?.bustCache === true;
    const suffix = bustCache ? `?_t=${Date.now()}` : '';
    return apiClient.get(`/admin/applications/${applicationId}/documents${suffix}`);
  },
  getApplicationKycSection: (applicationId: Id, options: QueryParams = {}) => {
    const suffix = options?.bustCache === true ? `?_t=${Date.now()}` : '';
    return apiClient.get(`/admin/applications/${applicationId}/kyc${suffix}`);
  },
  getApplicationBankSection: (applicationId: Id, options: QueryParams = {}) => {
    const bustCache = options?.bustCache === true;
    const suffix = bustCache ? `?_t=${Date.now()}` : '';
    return apiClient.get(`/admin/applications/${applicationId}/bank${suffix}`);
  },
  getApplicationJourneySection: (applicationId: Id) =>
    apiClient.get(`/admin/applications/${applicationId}/journey`),
  getApplicationLoanHistory: (applicationId: Id) =>
    apiClient.get(`/admin/applications/${applicationId}/loan-history`),
  getApplicationCam: (applicationId: Id) =>
    apiClient.get(`/admin/applications/${applicationId}/cam`),
  getApplicationCamVersion: (applicationId: Id, versionId: Id) =>
    apiClient.get(`/admin/applications/${applicationId}/cam/versions/${versionId}`),
  calculateApplicationCam: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/cam/calculate`, data),
  saveApplicationCam: (applicationId: Id, data: Payload) =>
    apiClient.put(`/admin/applications/${applicationId}/cam`, data),
  submitApplicationToUnderwriter: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/submit-to-underwriter`, data),
  returnApplicationToCreditManager: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/return-to-credit-manager`, data),
  approveApplicationByUnderwriter: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/underwriter-approve`, data),
  getApplicationWorkflowHistory: (applicationId: Id, params: QueryParams = {}) =>
    apiClient.get(`/admin/applications/${applicationId}/workflow-history`, { params }),

  // Get All Repayments (Global)
  getRepayments: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/admin/repayments${queryParams ? `?${queryParams}` : ''}`);
  },

  verifyRepayment: (repaymentId: Id, data: Payload) =>
    apiClient.post(`/admin/repayments/${repaymentId}/verify`, data),

  // Bank Statement Reconciliation
  reconcileStatement: (formData: FormData) =>
    apiClient.post('/admin/repayments/reconcile', formData, {
      headers: { 'Content-Type': undefined },
    }),

  commitReconciliation: (data: Payload) =>
    apiClient.post('/admin/repayments/reconcile/commit', data),

  getReconciliationBatch: (batchId: Id, params: QueryParams = {}) =>
    apiClient.get(`/admin/repayments/reconcile/batches/${batchId}`, { params }),

  listReconciliationBatches: (params: QueryParams = {}) =>
    apiClient.get('/admin/repayments/reconcile/batches', { params }),

  // Prepayment / Foreclosure calculation
  calculatePrepayment: (applicationId: Id, prepaymentDate: string | null = null) =>
    apiClient.post(`/admin/applications/${applicationId}/prepayment-calculate`, { prepaymentDate }),

  // Blocked Locations Management
  getBlockedLocations: () => apiClient.get('/admin/blocked-locations'),
  addBlockedLocation: (data: Payload) => apiClient.post('/admin/blocked-locations', data),
  removeBlockedLocation: (id: Id) => apiClient.delete(`/admin/blocked-locations/${id}`),

  // Blacklisted Customers Management
  getBlacklistUserSuggestions: (params: QueryParams = { limit: 15 }) =>
    apiClient.get('/admin/blacklisted-customers/suggestions', { params }),
  getBlacklistedCustomers: (params: QueryParams = {}) => {
    return apiClient.get('/admin/blacklisted-customers', { params });
  },
  addBlacklistedCustomer: (data: Payload) => apiClient.post('/admin/blacklisted-customers', data),
  removeBlacklistedCustomer: (id: Id) => apiClient.delete(`/admin/blacklisted-customers/${id}`),
  blacklistFromApplication: (applicationId: Id, data: Payload) => apiClient.post(`/admin/applications/${applicationId}/blacklist`, data),

  // Get Activity Logs
  getActivityLogs: (params: QueryParams = {}, config: RequestConfig = {}) => {
    return apiClient.get('/admin/activity-logs', { params, ...config });
  },

  // Get User Activity Tracking Logs (New)
  getUserActivity: (params: QueryParams = {}) => {
    return apiClient.get('/admin/user-activity', { params });
  },

  // Get Application Counts
  getApplicationCounts: (config: RequestConfig = {}) => apiClient.get('/admin/applications/counts', config),

  // Get All Settings
  getSettings: () => apiClient.get('/admin/settings'),

  // Update Settings (Super Admin only)
  updateSettings: (data: Payload) => apiClient.patch('/admin/settings', data),

  // Easebuzz Payment Gateway (Merchant Key + Salt)
  getPaymentGatewaySettings: () => apiClient.get('/admin/payment-gateway'),
  updatePaymentGatewaySettings: (data: Payload) => apiClient.patch('/admin/payment-gateway', data),

  // Credit / re-loan policy
  getCreditPolicySettings: () => apiClient.get('/admin/credit-policy/settings'),
  updateCreditPolicySettings: (data: Payload) => apiClient.patch('/admin/credit-policy/settings', data),
  getCreditBuckets: () => apiClient.get('/admin/credit-buckets'),
  updateCreditBuckets: (data: Payload) => apiClient.put('/admin/credit-buckets', data),
  rebalanceCreditBuckets: () => apiClient.post('/admin/credit-buckets/rebalance'),
  getCreditAllocationHistory: (params?: QueryParams) => apiClient.get('/admin/credit-buckets/allocation-history', { params }),
  getUserCreditPolicy: (userId: Id) => apiClient.get(`/admin/users/${userId}/credit-policy`),
  clearUserCreditCoolOff: (userId: Id, data: Payload) =>
    apiClient.post(`/admin/users/${userId}/credit-policy/clear-cooloff`, data),
  restoreUserCreditEligibility: (userId: Id, data: Payload) =>
    apiClient.post(`/admin/users/${userId}/credit-policy/restore`, data),

  // Super Admin Overrides
  updateSalaryDate: (userId: Id, data: Payload) =>
    apiClient.patch(`/admin/users/${userId}/salary-date`, data),

  updateRepaymentDueDate: (repaymentId: Id, data: Payload) =>
    apiClient.patch(`/admin/repayments/${repaymentId}/due-date`, data),

  overrideRepaymentStatus: (repaymentId: Id, data: Payload) =>
    apiClient.patch(`/admin/repayments/${repaymentId}/status-override`, data),

  // Document management
  getLoanDocument: (applicationId: Id, docType: string, params: QueryParams = {}) =>
    apiClient.get(`/admin/applications/${applicationId}/documents/${docType}`, {
      responseType: 'blob',
      params,
    }),

  getGenericDocument: (docType: string, applicationNumber: Id, url: string, fileFormat: string | null = null) => {
    const formatParam = fileFormat ? `&format=${encodeURIComponent(fileFormat)}` : '';
    return apiClient.get(`/documents/download/${docType}/${applicationNumber}?url=${encodeURIComponent(url)}${formatParam}`, {
      responseType: 'blob'
    });
  },

  // ==========================================
  // STRICT LOAN JOURNEY APIs
  // ==========================================

  // Verify/Reject video declaration (admin)
  verifyVideoDeclaration: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/verify-video`, data),

  // Get all video declarations (admin)
  getVideoDeclarations: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/admin/video-declarations${queryParams ? `?${queryParams}` : ''}`);
  },

  // ==========================================
  // TELECALLER & ASSISTED MODE
  // ==========================================
  assignApplication: (applicationId: Id, adminId: Id) =>
    apiClient.post(`/admin/applications/${applicationId}/assign`, { adminId }),

  assignBatchApplications: (data: Payload) =>
    apiClient.post('/admin/applications/assign-batch', data),

  autoAssignApplications: (data: Payload) =>
    apiClient.post('/admin/applications/auto-assign', data),

  reassignTelecallerApplications: (applicationIds: Id[], adminId: Id) =>
    apiClient.post('/admin/applications/reassign-telecaller', { applicationIds, adminId }),

  markTelecallerAbsent: (telecallerId: Id) =>
    apiClient.post(`/admin/telecallers/${telecallerId}/mark-absent`),

  markTelecallerAvailable: (telecallerId: Id) =>
    apiClient.post(`/admin/telecallers/${telecallerId}/mark-available`),

  assignCreditManager: (applicationId: Id, adminId: Id) =>
    apiClient.post(`/admin/applications/${applicationId}/assign-credit`, { adminId }),

  autoAssignCreditManagers: () =>
    apiClient.post('/admin/applications/auto-assign-credit'),

  logCall: (data: Payload) =>
    apiClient.post('/admin/calls/log', data),

  verifyCustomerReference: (applicationId: Id, data: Payload) =>
    apiClient.post(`/admin/applications/${applicationId}/verify-reference`, data),

  ensureAssistedToken: (applicationId: Id) =>
    apiClient.post(`/admin/applications/${applicationId}/ensure-assisted-token`),

  lockApplication: (id: Id) =>
    apiClient.post(`/admin/applications/${id}/lock`),

  unlockApplication: (id: Id) =>
    apiClient.post(`/admin/applications/${id}/unlock`),

  getTelecallerStats: () =>
    apiClient.get('/admin/telecaller/stats'),

  getCallLogs: (applicationId: Id, { force = false }: { force?: boolean } = {}) =>
    apiClient.get(
      `/admin/applications/${applicationId}/call-logs`,
      force ? { params: { _t: Date.now() } } : undefined
    ),

  getAdmins: (role: string | null = null) =>
    apiClient.get(`/admin/admins${role ? `?role=${role}` : ''}`),

  submitAssistedApplication: (data: Payload) =>
    apiClient.post('/admin/applications/assisted-submit', data),

  // ==========================================
  // NOTIFICATIONS & APPLICATION HISTORY
  // ==========================================
  getNotifications: () => Promise.resolve({ status: 1, data: [] }),
  getLoanAuditLogs: (applicationId: Id, params: QueryParams = {}) =>
    apiClient.get(`/admin/applications/${applicationId}/history`, { params }),
  getApplicationStatusHistory: (applicationId: Id, params: QueryParams = {}) =>
    apiClient.get(`/admin/applications/${applicationId}/status-history`, { params }),
  markNotificationRead: () => Promise.resolve({ status: 1, message: 'OK' }),

  lookupCustomer: (q: string) =>
    apiClient.get('/admin/customers/lookup', { params: { q } }),

  getCustomerHistory: (customerCode: Id) =>
    apiClient.get(`/admin/customers/${encodeURIComponent(customerCode)}/history`),

  lookupExistingCustomer: (params: QueryParams = {}) =>
    apiClient.get('/admin/customers/existing', { params }),

  getLookupCities: () =>
    apiClient.get('/admin/lookups/cities'),

  getLookupStates: () =>
    apiClient.get('/admin/lookups/states'),

  getLookupCreditManagers: () =>
    apiClient.get('/admin/lookups/credit-managers'),

  getCreditManagerReport: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/credit-managers', { params }),

  getUnassignedCreditLeads: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/credit-managers/unassigned', { params }),

  assignCreditManagersBatch: (applicationIds: Id[], adminId: Id) =>
    apiClient.post('/admin/applications/assign-credit-batch', { applicationIds, adminId }),

  getTelecallerReport: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/telecallers', { params }),

  getUnassignedTelecallerLeads: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/telecallers/unassigned', { params }),

  getAssignedTelecallerLeads: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/telecallers/assigned', { params }),

  getUnderwriterReport: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/underwriters', { params }),

  getUnassignedUnderwriterLeads: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/underwriters/unassigned', { params }),

  assignUnderwriter: (applicationId: Id, adminId: Id) =>
    apiClient.post(`/admin/applications/${applicationId}/assign-underwriter`, { adminId }),

  autoAssignUnderwriters: () =>
    apiClient.post('/admin/applications/auto-assign-underwriter'),

  getOperationsReport: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/operations', { params }),

  getUnassignedOpsLeads: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/operations/unassigned', { params }),

  assignOpsManager: (applicationId: Id, adminId: Id) =>
    apiClient.post(`/admin/applications/${applicationId}/assign-ops`, { adminId }),

  autoAssignOpsManagers: () =>
    apiClient.post('/admin/applications/auto-assign-ops'),

  getManagementFunnel: (params: QueryParams = {}) =>
    apiClient.get('/admin/reports/management-funnel', { params }),

  getJourneyPipeline: (applicationId: Id) =>
    apiClient.get(`/admin/applications/${applicationId}/journey-pipeline`),

  // MIS Export
  exportMIS: (category = 'all') =>
    apiClient.get(`/admin/mis-export?category=${category}`, {
      responseType: 'blob',
    }),

  // Loan Book MIS
  getLoanBook: (params: QueryParams = {}) =>
    apiClient.get('/admin/mis/loan-book', { params }),

  getLoanBookSummary: (params: QueryParams = {}) =>
    apiClient.get('/admin/mis/loan-book/summary', { params }),

  getLoanBookDpdSummary: (params: QueryParams = {}) =>
    apiClient.get('/admin/mis/loan-book/dpd-summary', { params }),

  getLoanBookMonthly: (params: QueryParams = {}) =>
    apiClient.get('/admin/mis/loan-book/monthly', { params }),

  exportLoanBook: (params: QueryParams = {}) =>
    apiClient.get('/admin/mis/loan-book/export', { params, responseType: 'blob' }),

  // ==========================================
  // LEDGER BOOK (Phase 5)
  // ==========================================
  getLedgerEntries: (params: QueryParams = {}) => {
    return apiClient.get('/admin/ledger', { params });
  },

  getLedgerSummary: (params: QueryParams = {}) => {
    return apiClient.get('/admin/ledger/summary', { params });
  },

  getLedgerAccounts: (params: QueryParams = {}) => {
    return apiClient.get('/admin/ledger/accounts', { params });
  },

  getLoanLedger: (loanId: Id) => apiClient.get(`/admin/ledger/loan/${loanId}`),

  postLedgerAdjustment: (data: Payload) => apiClient.post('/admin/ledger/adjustment', data),

  exportLedgerCSV: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/admin/ledger/export${queryParams ? `?${queryParams}` : ''}`, {
      responseType: 'blob'
    });
  },

  // ==========================================
  // CASE MANAGEMENT AND TICKETS
  // ==========================================
  getCases: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/admin/cases${queryParams ? `?${queryParams}` : ''}`);
  },

  createCase: (data: Payload) => apiClient.post('/admin/cases', data),

  assignCase: (caseId: Id, data: Payload) => apiClient.patch(`/admin/cases/${caseId}/assign`, data),

  addCaseComment: (caseId: Id, data: Payload) => apiClient.post(`/admin/cases/${caseId}/comments`, data),

  getCaseComments: (caseId: Id) => apiClient.get(`/admin/cases/${caseId}/comments`),

  resolveCase: (caseId: Id, data: Payload) => apiClient.patch(`/admin/cases/${caseId}/resolve`, data),

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  getAuditLogs: (params: QueryParams = {}) => {
    return apiClient.get('/admin/audit-logs', { params });
  },

  // ==========================================
  // DEAD LETTER QUEUE (DLQ)
  // ==========================================
  getDLQ: (params: QueryParams = {}) => {
    return apiClient.get('/admin/dlq', { params });
  },

  retryDLQ: (jobId: Id) => apiClient.post(`/admin/dlq/${jobId}/retry`),

  purgeDLQ: (jobId: Id) => apiClient.delete(`/admin/dlq/${jobId}`),

  // Digitap KYC (canonical paths; /kyc/digio/* still aliases on backend)
  initiateDigioKYC: (applicationId: Id) =>
    apiClient.post(`/kyc/digitap/initiate/${applicationId}`),

  verifyPan: (userId: Id, data: Payload) =>
    apiClient.post(`/kyc/digitap/pan/verify/${userId}`, data),

  manualVerifyPan: (userId: Id, data: Payload) =>
    apiClient.post(`/kyc/digitap/pan/manual-verify/${userId}`, data),

  manualVerifyBankDetails: (applicationId: Id, data: Payload) =>
    apiClient.post(`/kyc/digitap/bank/manual-verify/${applicationId}`, data),

  manualVerifyMandate: (applicationId: Id, data: Payload) =>
    apiClient.post(`/kyc/digitap/mandate/manual-verify/${applicationId}`, data),

  updateDisbursalBankDetails: (applicationId: Id, data: Payload) =>
    apiClient.put(`/kyc/digitap/bank/update/${applicationId}`, data),

  faceMatch: (applicationId: Id) =>
    apiClient.post(`/kyc/digitap/facematch/${applicationId}`),

  rejectSelfie: (applicationId: Id, data: Payload) =>
    apiClient.post(`/kyc/selfie/reject/${applicationId}`, data),

  livenessCheck: (applicationId: Id) =>
    apiClient.post(`/kyc/digitap/liveness/${applicationId}`),

  initiateEsign: (applicationId: Id, data: QueryParams = {}) =>
    apiClient.post(`/kyc/digitap/esign/${applicationId}`, data),

  checkEsignStatus: (applicationId: Id) =>
    apiClient.post(`/kyc/digitap/esign/${applicationId}/status`),

  initiateMandate: (applicationId: Id, data: QueryParams = {}) =>
    apiClient.post(`/kyc/digitap/mandate/${applicationId}`, {
      mandate_type: 'NACH',
      ...data,
    }),

  resendMandateAuthLink: (applicationId: Id) =>
    apiClient.post(`/kyc/digitap/mandate/${applicationId}/resend`),

  verifyEmployment: (applicationId: Id, data: Payload) =>
    apiClient.post(`/kyc/digitap/employment/verify/${applicationId}`, data),

  verifyProfessional: (applicationId: Id, idType: string, data: Payload) =>
    apiClient.post(`/kyc/digitap/professional/verify/${applicationId}/${idType}`, data),

  sendOfficeEmailOTP: (userId: Id, data: Payload) =>
    apiClient.post(`/admin/users/${userId}/send-office-otp`, data),

  verifyOfficeEmailOTP: (userId: Id, data: Payload) =>
    apiClient.post(`/admin/users/${userId}/verify-office-otp`, data),
};
