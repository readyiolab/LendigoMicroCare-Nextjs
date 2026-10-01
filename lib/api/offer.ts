import api from './config';
import type { Id, Payload } from './types';

/**
 * Offer API - Customer side
 */
export const offerAPI = {
    // Get offer details
    getOffer: async (applicationId: Id) => {
        const response = await api.get(`/loan/offers/${applicationId}`);
        return response;
    },

    // Accept offer with video (legacy - via multer)
    acceptOffer: async (applicationId: Id, videoFile: Blob) => {
        const formData = new FormData();
        formData.append('video', videoFile);

        const response = await api.post(`/loan/offers/${applicationId}/accept`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response;
    },

    // Accept offer with video URL (direct upload)
    acceptOfferWithUrl: async (applicationId: Id, videoUrl: string) => {
        const response = await api.post(`/loan/offers/${applicationId}/accept`, {
            video_url: videoUrl,
        });
        return response;
    },

    // Reject offer
    rejectOffer: async (applicationId: Id, rejectionReason: string) => {
        const response = await api.post(`/loan/offers/${applicationId}/reject`, {
            rejection_reason: rejectionReason
        });
        return response;
    },

    // Ask the team to change amount / tenure (payload: requested_amount, requested_tenure_days | requested_repayment_date, customer_note)
    requestRevision: async (applicationId: Id, payload: Payload) => {
        const response = await api.post(`/loan/offers/${applicationId}/request-revision`, payload);
        return response;
    },

    // Admin: Send offer
    sendOffer: async (applicationId: Id, offerData: Payload) => {
        const response = await api.post(`/loan/offers/${applicationId}/send`, offerData);
        return response;
    },

    // Admin: customer change requests for an offer
    getRevisionRequests: async (applicationId: Id) => {
        const response = await api.get(`/loan/offers/${applicationId}/revisions`);
        return response;
    }
};

export default offerAPI;
