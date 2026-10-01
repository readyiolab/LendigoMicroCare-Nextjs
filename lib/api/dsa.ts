import apiClient from './config';
import type { ApiResponse, Id, Payload, QueryParams } from './types';

/** apiClient interceptor returns { status, message, data } — not axios response.data */
export function unwrapDsaResponse(res: ApiResponse<ApiResponse | unknown> | null | undefined) {
  if (!res) return { ok: false, data: null, message: '' };
  if (res.status === 1) return { ok: true, data: res.data, message: res.message };
  const nested = res.data as ApiResponse | null | undefined;
  if (nested?.status === 1) return { ok: true, data: nested.data, message: nested.message };
  return { ok: false, data: res.data ?? null, message: res.message || 'Request failed' };
}

export const dsaAPI = {
  getDashboard: (params?: QueryParams) => apiClient.get('/admin/dsa/dashboard', { params }),
  getHierarchy: (params?: QueryParams) => apiClient.get('/admin/dsa/hierarchy', { params }),
  listPartners: () => apiClient.get('/admin/dsa/partners'),

  listLeads: (params?: QueryParams) => apiClient.get('/admin/dsa/leads', { params }),
  getLead: (leadId: Id) => apiClient.get(`/admin/dsa/leads/${leadId}`),
  createLead: (data: Payload) => apiClient.post('/admin/dsa/leads', data),
  updateLead: (leadId: Id, data: Payload) => apiClient.patch(`/admin/dsa/leads/${leadId}`, data),
  addLeadDocument: (leadId: Id, data: Payload) => apiClient.post(`/admin/dsa/leads/${leadId}/documents`, data),
  convertLead: (leadId: Id) => apiClient.post(`/admin/dsa/leads/${leadId}/convert`),

  listApplications: (params?: QueryParams) => apiClient.get('/admin/dsa/applications', { params }),
  getApplicationStatus: (applicationId: Id) =>
    apiClient.get(`/admin/dsa/applications/${applicationId}/status`),

  listCommissions: (params?: QueryParams) => apiClient.get('/admin/dsa/commissions', { params }),
  monthlyEarnings: (months = 6) => apiClient.get('/admin/dsa/commissions/monthly', { params: { months } }),

  listSettlements: (params?: QueryParams) => apiClient.get('/admin/dsa/settlements', { params }),
  createSettlement: (data: Payload) => apiClient.post('/admin/dsa/settlements', data),
  approveSettlement: (id: Id, approve = true) =>
    apiClient.post(`/admin/dsa/settlements/${id}/approve`, { approve }),
  markSettlementPaid: (id: Id) => apiClient.post(`/admin/dsa/settlements/${id}/paid`),

  getReports: (params?: QueryParams) => apiClient.get('/admin/dsa/reports', { params }),
  listTeam: (params?: QueryParams) => apiClient.get('/admin/dsa/team', { params }),
};
