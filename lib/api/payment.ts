import apiClient from './config';
import type { Id, Payload } from './types';

export const paymentAPI = {
  /**
   * Initiate Easebuzz hosted checkout for full EMI or part payment.
   * @param {number|string} applicationId
   * @param {{ mode: 'full'|'part', repaymentId?: number, amount?: number }} data
   */
  initiateRepayment: (applicationId: Id, data: Payload) =>
    apiClient.post(`/payment/repayment/${applicationId}/initiate`, data),

  getTransactionStatus: (txnid: string | number) =>
    apiClient.get(`/payment/transaction/${encodeURIComponent(txnid)}/status`),
};
