import apiClient from './config';

/** Strip spaces and uppercase — IFSC must be exactly 11 chars (e.g. AUBL0002600). */
export function normalizeIfsc(ifsc: unknown) {
  return String(ifsc || '').replace(/\s+/g, '').toUpperCase().slice(0, 11);
}

export const utilityAPI = {
  // Get Pincode Details
  getPincodeDetails: (pincode: unknown) =>
    apiClient.get(`/utility/pincode/${String(pincode || '').trim()}`),

  // Validate IFSC Code
  validateIFSC: (ifsc: unknown) => {
    const code = normalizeIfsc(ifsc);
    return apiClient.get(`/utility/ifsc/${encodeURIComponent(code)}`);
  },

  // Health Check
  healthCheck: () => apiClient.get('/utility/health'),
};
