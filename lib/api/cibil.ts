import api from './config';
import type { BlobResponse, Id, Payload, QueryParams } from './types';

function downloadBlob(response: BlobResponse, fallbackName: string) {
  const fileName =
    String(response.headers['content-disposition'] ?? '').split('filename=')[1]?.replace(/"/g, '') ||
    fallbackName;
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** When responseType=blob, API error JSON arrives as a Blob — parse it for a real message. */
async function messageFromBlobError(caught: unknown, fallback: string) {
  const err = caught as { response?: { data?: unknown }; data?: unknown; message?: unknown } | null;
  const data = err?.response?.data ?? err?.data ?? caught;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      return json.message || json.error || fallback;
    } catch {
      return fallback;
    }
  }
  const body = data as { message?: string } | null;
  if (typeof data === 'object' && body?.message) return body.message;
  if (typeof err?.message === 'string' && err.message !== 'Request failed with status code 400') {
    return err.message;
  }
  return fallback;
}

export const cibilApi = {
  downloadTemplate: async () => {
    const response = await api.get<BlobResponse>('/cibil/template', { responseType: 'blob' });
    downloadBlob(response, 'CIBIL_Input_Template.xlsx');
  },

  generateFromManual: async (data: Payload, config?: QueryParams) => {
    const response = await api.post<BlobResponse>(
      '/cibil/generate-tudf',
      { data, config },
      { responseType: 'blob' }
    );
    downloadBlob(response, 'CIBIL_Manual_Report.txt');
    return response.data;
  },

  generateFromDB: async (filters?: QueryParams, config?: QueryParams) => {
    const response = await api.post<BlobResponse>(
      '/cibil/generate-from-db',
      { ...filters, config },
      { responseType: 'blob' }
    );
    downloadBlob(response, 'CIBIL_Report.txt');
  },

  validateHealth: async (filters?: QueryParams) => api.post('/cibil/validate-db', filters),

  getHeaderDefaults: async () => api.get('/cibil/header-defaults'),

  createCycle: async (payload: Payload) => api.post('/cibil/reporting-cycles', payload),

  listCycles: async (params: QueryParams = {}) =>
    api.get('/cibil/reporting-cycles', { params }),

  getCycle: async (id: Id) => api.get(`/cibil/reporting-cycles/${id}`),

  loadCycle: async (id: Id) => api.post(`/cibil/reporting-cycles/${id}/load`),

  getCycleGrid: async (id: Id, params: QueryParams = {}) =>
    api.get(`/cibil/reporting-cycles/${id}/grid`, { params }),

  getValidationErrors: async (id: Id, params: QueryParams = {}) =>
    api.get(`/cibil/reporting-cycles/${id}/validation-errors`, { params }),

  generateCycle: async (id: Id) => api.post(`/cibil/reporting-cycles/${id}/generate`),

  downloadCycle: async (id: Id) => {
    try {
      const response = await api.get<BlobResponse>(`/cibil/reporting-cycles/${id}/download`, {
        responseType: 'blob',
      });
      const ct = String(response.headers?.['content-type'] || '');
      if (ct.includes('application/json')) {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Download failed');
      }
      downloadBlob(response, 'CIBIL_Report.xlsx');
    } catch (err) {
      const message = await messageFromBlobError(
        err,
        'Excel download failed. Load from LOS first, fix invalid rows, then try again.'
      );
      throw new Error(message);
    }
  },

  submitCycle: async (id: Id, body: QueryParams = {}) =>
    api.post(`/cibil/reporting-cycles/${id}/submit`, body),
};

export default cibilApi;
