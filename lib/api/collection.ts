import apiClient from './config';
import type { Id, Payload, QueryParams, RequestConfig } from './types';
import { toQueryString } from './types';

export const collectionAPI = {
  // ==========================================
  // OVERDUE & PENALTY
  // ==========================================

  // Get all overdue repayments with penalty calculations
  getOverdueRepayments: (params: QueryParams = {}) => {
    const p = { ...params };
    // Prefer _t for cache bust (middleware strips it); keep _ for older callers
    if (p.search && !p._t) p._t = Date.now();
    const queryParams = toQueryString(p);
    return apiClient.get(`/admin/collection/overdue${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get penalty details for a specific repayment
  getPenaltyDetails: (repaymentId: Id) =>
    apiClient.get(`/admin/collection/penalty/${repaymentId}`),

  // Manually trigger daily penalty calculation
  applyDailyPenalties: () =>
    apiClient.post('/admin/collection/penalty/apply'),

  // ==========================================
  // BORROWER CONTACT
  // ==========================================

  // Get borrower contact information
  getBorrowerContact: (userId: Id) =>
    apiClient.get(`/admin/collection/borrower/${userId}/contact`),

  // ==========================================
  // COLLECTION REMARKS
  // ==========================================

  // Add a collection remark
  addCollectionRemark: (data: Payload) =>
    apiClient.post('/admin/collection/remarks', data),

  // Get collection remarks for a loan
  getCollectionRemarks: (loanApplicationId: Id) =>
    apiClient.get(`/admin/collection/remarks/${loanApplicationId}`),

  // ==========================================
  // FOLLOW-UP
  // ==========================================

  // Update follow-up status
  updateFollowUpStatus: (data: Payload) =>
    apiClient.put('/admin/collection/followup', data),

  // ==========================================
  // REPORTS & DASHBOARD
  // ==========================================

  // Generate overdue report
  generateOverdueReport: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/admin/collection/report${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get collection dashboard statistics
  getCollectionDashboard: (params: QueryParams = {}) =>
    apiClient.get('/admin/collection/dashboard', { params }),

  // Pending Collection MIS export (CSV / XLSX blob)
  exportPendingCollectionMIS: (params: QueryParams = {}) =>
    apiClient.get('/admin/collection/mis/pending-export', {
      params,
      responseType: 'blob',
    }),

  // ==========================================
  // PROMISE TO PAY (PTP)
  // ==========================================
  recordPTP: (data: Payload) => apiClient.post('/admin/collection/ptp', data),
  getPTPs: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/admin/collection/ptp${queryParams ? `?${queryParams}` : ''}`);
  },
  updatePTPStatus: (id: Id, data: Payload) => apiClient.patch(`/admin/collection/ptp/${id}/status`, data),

  // ==========================================
  // SETTLEMENTS (MAKER-CHECKER)
  // ==========================================
  requestSettlement: (data: Payload) => apiClient.post('/admin/collection/settlement/request', data),
  getSettlements: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/admin/collection/settlements${queryParams ? `?${queryParams}` : ''}`);
  },
  actionSettlement: (id: Id, data: Payload) => apiClient.patch(`/admin/collection/settlement/${id}/action`, data),
  searchLoans: (query?: QueryParams, config: RequestConfig = {}) =>
    apiClient.get('/admin/collection/search-loans', {
      params: { query: query ?? '', _: Date.now() },
      ...config,
    }),
  getSettlementDetails: (loanApplicationId: Id) => apiClient.get(`/admin/collection/settlement-details/${loanApplicationId}`),
  recordSettlementPayment: (id: Id, data: Payload) => apiClient.post(`/admin/collection/settlement/${id}/record-payment`, data),

  // ==========================================
  // COLLECTION PUNCH (maker-checker)
  // ==========================================
  getCollectionPunchPrefill: (applicationId: Id) =>
    apiClient.get(`/admin/collection/punch/${applicationId}/prefill`),
  submitCollectionPunch: (data: Payload) => apiClient.post('/admin/collection/punch', data),
  getPendingCollectionPunches: (params: QueryParams = {}) => {
    const queryParams = toQueryString(params);
    return apiClient.get(`/admin/collection/punch/pending${queryParams ? `?${queryParams}` : ''}`);
  },
  getApprovalSummary: ({ force = false }: { force?: boolean } = {}) =>
    apiClient.get('/admin/collection/approvals/summary', force ? { params: { _t: Date.now() } } : undefined),
  approveCollectionPunch: (id: Id, data: Payload) => apiClient.post(`/admin/collection/punch/${id}/approve`, data),
  rejectCollectionPunch: (id: Id, data: Payload) => apiClient.post(`/admin/collection/punch/${id}/reject`, data),

  // ==========================================
  // BUCKETS / AGENTS / TODAY WORK
  // ==========================================
  getBuckets: () => apiClient.get('/admin/collection/buckets'),
  getCollectionAgents: () => apiClient.get('/admin/collection/agents'),
  upsertCollectionAgent: (data: Payload) => apiClient.post('/admin/collection/agents', data),
  allocateAgents: () => apiClient.post('/admin/collection/buckets/allocate'),
  getTodayWork: (params: QueryParams = {}) =>
    apiClient.get('/admin/collection/today-work', { params }),
  exportCollectorProductivity: (params: QueryParams = {}) =>
    apiClient.get('/admin/collection/mis/productivity-export', {
      params,
      responseType: 'blob',
    }),

  // ==========================================
  // BUREAU REPORTING
  // ==========================================
  getBureauExportHistory: () => apiClient.get('/admin/collection/bureau/history'),
  exportBureauReport: (data: Payload) => apiClient.post('/admin/collection/bureau/export', data),
};
