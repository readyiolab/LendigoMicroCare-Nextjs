import api from './config';
import type { Id, Payload, QueryParams } from './types';

/**
 * Role Management API
 */
export const roleAPI = {
    // Get all roles
    getRoles: async (params: QueryParams = {}) => {
        const response = await api.get('/admin/roles', { params });
        return response;
    },

    // Get single role
    getRole: async (id: Id) => {
        const response = await api.get(`/admin/roles/${id}`);
        return response;
    },

    // Create role
    createRole: async (data: Payload) => {
        const response = await api.post('/admin/roles', data);
        return response;
    },

    // Update role
    updateRole: async (id: Id, data: Payload) => {
        const response = await api.put(`/admin/roles/${id}`, data);
        return response;
    },

    // Delete role
    deleteRole: async (id: Id) => {
        const response = await api.delete(`/admin/roles/${id}`);
        return response;
    },

    // Get all statuses
    getAllStatuses: async () => {
        const response = await api.get('/admin/roles/statuses/all');
        return response;
    },

    // Get my accessible statuses
    getMyStatuses: async () => {
        const response = await api.get('/admin/roles/statuses/my-access');
        return response;
    },

    // Get all admin users (supports page, limit, q)
    getAdminUsers: async (params: QueryParams = {}) => {
        const response = await api.get('/admin/roles/users/all', { params });
        return response;
    },

    // Create admin user
    createAdminUser: async (data: Payload) => {
        const response = await api.post('/admin/roles/users', data);
        return response;
    },

    // Update admin user
    updateAdminUser: async (id: Id, data: Payload) => {
        const response = await api.put(`/admin/roles/users/${id}`, data);
        return response;
    },

    // Delete admin user
    deleteAdminUser: async (id: Id) => {
        const response = await api.delete(`/admin/roles/users/${id}`);
        return response;
    },

    // Reset admin user password
    resetAdminUserPassword: async (id: Id, password: unknown) => {
        const response = await api.post(`/admin/roles/users/${id}/reset-password`, { password });
        return response;
    },

    // Get single admin user
    getAdminUser: async (id: Id) => {
        const response = await api.get(`/admin/roles/users/${id}`);
        return response;
    },

    // Get permission catalog
    getPermissionCatalog: async () => {
        const response = await api.get('/admin/permissions/catalog');
        return response;
    },

    // Get branches
    getBranches: async () => {
        const response = await api.get('/admin/branches');
        return response;
    },
};

/**
 * Loan Product API
 */
export const productAPI = {
    // Get loan products. Default: active only (with fees unless slim).
    // Pass { all: true } for admin product management (includes inactive).
    getProducts: async (opts: QueryParams = {}) => {
        const params = new URLSearchParams();
        if (opts.all === true || opts.all === 'true') params.set('all', 'true');
        if (opts.slim) params.set('slim', 'true');
        const qs = params.toString();
        const response = await api.get(qs ? `/loan/products?${qs}` : '/loan/products');
        return response;
    },

    // Get default product
    getDefaultProduct: async () => {
        const response = await api.get('/loan/products/default');
        return response;
    },

    // Get single product
    getProduct: async (id: Id) => {
        const response = await api.get(`/loan/products/${id}`);
        return response;
    },

    // Calculate loan
    calculateLoan: async (data: Payload) => {
        const response = await api.post('/loan/products/calculate', data);
        return response;
    },

    // Create product (admin only)
    createProduct: async (data: Payload) => {
        const response = await api.post('/loan/products', data);
        return response;
    },

    // Update product (admin only)
    updateProduct: async (id: Id, data: Payload) => {
        const response = await api.put(`/loan/products/${id}`, data);
        return response;
    },

    // Activate product (admin only)
    activateProduct: async (id: Id) => {
        const response = await api.put(`/loan/products/${id}/activate`);
        return response;
    },
    // Deactivate product (admin only)
    deactivateProduct: async (id: Id) => {
        const response = await api.put(`/loan/products/${id}/deactivate`);
        return response;
    },
    // Set default product for new applications
    setDefaultProduct: async (id: Id) => {
        const response = await api.put(`/loan/products/${id}/default`);
        return response;
    },
    // Delete product (admin only)
    deleteProduct: async (id: Id) => {
        const response = await api.delete(`/loan/products/${id}`);
        return response;
    }
};

const rolesApi = { roleAPI, productAPI };

export default rolesApi;
