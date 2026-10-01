import apiClient from './config';
import type { Id, Payload } from './types';

export const account360API = {
  getAccount360: (accountRef: Id) =>
    apiClient.get(`/admin/accounts/${encodeURIComponent(accountRef)}/360`),

  createPtp: (accountRef: Id, data: Payload) =>
    apiClient.post(`/admin/accounts/${encodeURIComponent(accountRef)}/ptp`, data),

  updatePtpStatus: (accountRef: Id, ptpId: Id, data: Payload) =>
    apiClient.patch(`/admin/accounts/${encodeURIComponent(accountRef)}/ptp/${ptpId}/status`, data),

  recordPartPayment: (accountRef: Id, data: Payload) =>
    apiClient.post(`/admin/accounts/${encodeURIComponent(accountRef)}/part-payments`, data),

  requestSettlement: (accountRef: Id, data: Payload) =>
    apiClient.post(`/admin/accounts/${encodeURIComponent(accountRef)}/settlements`, data),

  actionSettlement: (accountRef: Id, settlementId: Id, data: Payload) =>
    apiClient.patch(
      `/admin/accounts/${encodeURIComponent(accountRef)}/settlements/${settlementId}/action`,
      data
    ),

  recordSettlementPayment: (accountRef: Id, settlementId: Id, data: Payload) =>
    apiClient.post(
      `/admin/accounts/${encodeURIComponent(accountRef)}/settlements/${settlementId}/payment`,
      data
    ),

  addRemark: (accountRef: Id, data: Payload) =>
    apiClient.post(`/admin/accounts/${encodeURIComponent(accountRef)}/remarks`, data),

  issueNoc: (accountRef: Id) =>
    apiClient.post(`/admin/accounts/${encodeURIComponent(accountRef)}/noc/issue`),
};
