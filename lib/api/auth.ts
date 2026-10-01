import apiClient from './config';
import type { Id, Payload } from './types';

export const authAPI = {
  // Register - Send OTP
  register: (data: Payload) => apiClient.post('/auth/register', data),

  // Check Availability (pass excludeUserId when filling on behalf of a customer — DSA / assisted)
  checkAvailability: (identifier: string, excludeUserId: Id | null = null) => {
    const params = new URLSearchParams({ identifier });
    if (excludeUserId != null && excludeUserId !== '') {
      params.set('excludeUserId', String(excludeUserId));
    }
    return apiClient.get(`/auth/check-availability?${params.toString()}`);
  },


  // Verify Register OTP
  verifyRegister: (data: Payload) => apiClient.post('/auth/register/verify', data),

  // Login - Send OTP
  login: (data: Payload) => apiClient.post('/auth/login', data),

  // Verify Login OTP
  verifyLogin: (data: Payload) => apiClient.post('/auth/login/verify', data),

  // Resend OTP
  resendOTP: (data: Payload) => apiClient.post('/auth/otp/resend', data),

  // Refresh Token - no body needed, refresh token is in HTTP-only cookie
  refreshToken: () => apiClient.post('/auth/token/refresh', {}),

  // Logout - no body needed, refresh token is in HTTP-only cookie
  logout: () => apiClient.post('/auth/logout', {}),

  // Get Current User
  getCurrentUser: () => apiClient.get('/auth/me'),

  // Update Profile
  updateProfile: (data: Payload) => apiClient.post('/auth/profile/update', data),

  // Setup 2FA
  setup2FA: (data: Payload) => apiClient.post('/auth/2fa/setup', data),

  // Verify 2FA
  verify2FA: (data: Payload) => apiClient.post('/auth/2fa/verify', data),

  // Disable 2FA
  disable2FA: (data: Payload) => apiClient.post('/auth/2fa/disable', data),

  // Personal Email Verification (targetUserId = assisted fill on behalf of customer)
  sendPersonalEmailOTP: (email: string, targetUserId: Id | null = null) =>
    apiClient.post('/auth/personal-email/verify/send', {
      email,
      ...(targetUserId != null ? { targetUserId } : {}),
    }),
  verifyPersonalEmailOTP: (data: Payload, targetUserId: Id | null = null) =>
    apiClient.post('/auth/personal-email/verify/confirm', {
      ...data,
      ...(targetUserId != null ? { targetUserId } : {}),
    }),

  // Mobile Number Verification
  sendMobileOTP: (data: Payload) => apiClient.post('/auth/mobile/verify/send', data),
  verifyMobileOTP: (data: Payload) => apiClient.post('/auth/mobile/verify/confirm', data),

  // Referral Stats
  getReferralStats: () => apiClient.get('/auth/referral/stats'),
};
