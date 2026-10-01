import apiClient from './config';
import type { Id, Payload, QueryParams } from './types';
import { toQueryString } from './types';
import { getBrePolicyVaultToken } from '../services/brePolicyVault';

export const breAPI = {
    getVaultStatus: () => {
        const token = getBrePolicyVaultToken();
        return apiClient.get('/admin/bre/vault/status', {
            headers: token ? { 'X-BRE-Policy-Vault': token } : {},
        });
    },

    unlockVault: (password: unknown) =>
        apiClient.post('/admin/bre/vault/unlock', { password }),
    // ==========================================
    // EVALUATION ROUTES
    // ==========================================
    evaluateApplication: (data: Payload) =>
        apiClient.post('/bre/evaluate', data),

    getEvaluationById: (id: Id) =>
        apiClient.get(`/bre/evaluation/${id}`),

    getMyEvaluations: (params: QueryParams = {}) => {
        const queryParams = toQueryString(params);
        return apiClient.get(`/bre/my-evaluations${queryParams ? `?${queryParams}` : ''}`);
    },

    /** Customer portal — requires customer session */
    getApplicationEvaluations: (applicationId: Id, params: QueryParams = {}) => {
        const queryParams = toQueryString(params);
        return apiClient.get(`/bre/application/${applicationId}/evaluations${queryParams ? `?${queryParams}` : ''}`);
    },

    /** Admin application detail — uses admin auth (not /bre/application/* customer route) */
    getAdminApplicationEvaluations: (applicationId: Id, params: QueryParams = {}) => {
        const query = { application_id: applicationId, ...params };
        const queryParams = toQueryString(query);
        return apiClient.get(`/admin/bre/admin/evaluations${queryParams ? `?${queryParams}` : ''}`);
    },

    // ==========================================
    // ADMIN ROUTES - CATEGORIES
    // ==========================================
    getCategories: () =>
        apiClient.get('/admin/bre/rules/categories'),

    getFields: () =>
        apiClient.get('/admin/bre/rules/fields'),

    // ==========================================
    // ADMIN ROUTES - RULES
    // ==========================================
    getRules: (params: QueryParams = {}) => {
        const queryParams = toQueryString(params);
        return apiClient.get(`/admin/bre/rules${queryParams ? `?${queryParams}` : ''}`);
    },

    getRuleById: (id: Id) =>
        apiClient.get(`/admin/bre/rules/${id}`),

    createRule: (data: Payload) =>
        apiClient.post('/admin/bre/rules', data),

    updateRule: (id: Id, data: Payload) =>
        apiClient.put(`/admin/bre/rules/${id}`, data),

    toggleRule: (id: Id, isActive: unknown) =>
        apiClient.patch(`/admin/bre/rules/${id}/toggle`, { is_active: isActive }),

    deleteRule: (id: Id) =>
        apiClient.delete(`/admin/bre/rules/${id}`),

    getRuleHistory: (id: Id, params: QueryParams = {}) => {
        const queryParams = toQueryString(params);
        return apiClient.get(`/admin/bre/rules/${id}/history${queryParams ? `?${queryParams}` : ''}`);
    },

    getHistory: (params: QueryParams = {}) => {
        const queryParams = toQueryString(params);
        return apiClient.get(`/admin/bre/history${queryParams ? `?${queryParams}` : ''}`);
    },

    // ==========================================
    // ADMIN ROUTES - POLICIES
    // ==========================================
    getPolicies: () =>
        apiClient.get('/admin/bre/policies'),

    getPolicyById: (id: Id) =>
        apiClient.get(`/admin/bre/policies/${id}`),

    createPolicy: (data: Payload) =>
        apiClient.post('/admin/bre/policies', data),

    updatePolicy: (id: Id, data: Payload) =>
        apiClient.put(`/admin/bre/policies/${id}`, data),

    // ==========================================
    // ADMIN ROUTES - MANUAL REVIEWS
    // ==========================================
    getAllEvaluations: (params: QueryParams = {}) => {
        const queryParams = toQueryString(params);
        return apiClient.get(`/admin/bre/admin/evaluations${queryParams ? `?${queryParams}` : ''}`);
    },

    getPendingManualReviews: (params: QueryParams = {}) => {
        const queryParams = toQueryString(params);
        // Corrected path based on backend routes (adminRoutes mounts breadmin at /bre)
        // So /api/v1/admin/bre/admin/manual-reviews is the path if we follow breadminRoutes structure
        // Let's double check breadminRoutes.js...
        // It has router.get('/admin/manual-reviews', ...)
        // And adminRoutes mounts it at /bre
        // So path is /admin/bre/admin/manual-reviews
        return apiClient.get(`/admin/bre/admin/manual-reviews${queryParams ? `?${queryParams}` : ''}`);
    },

    updateManualDecision: (data: Payload) =>
        apiClient.post('/admin/bre/admin/manual-decision', data),

    reEvaluateApplication: (data: Payload) =>
        apiClient.post('/admin/bre/admin/re-evaluate', data),

    /** Seconds between admin RE-RUNs (must match backend BRE_ADMIN_COOLDOWN_SEC) */
    adminReEvaluateCooldownSec: 60,

    simulateEvaluation: (data: Payload) =>
        apiClient.post('/admin/bre/admin/simulate', data),
};
