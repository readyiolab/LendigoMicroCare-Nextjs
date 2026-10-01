import { isStrictEmail } from '@/lib/apiErrorMessage';
export const AUTH_SMS_OTP_ENABLED = process.env.NEXT_PUBLIC_AUTH_SMS_OTP_ENABLED !== 'false';

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const isValidIndianMobile = (mobile) =>
  /^[6-9]\d{9}$/.test(String(mobile || '').replace(/\D/g, '').slice(-10));

export const resolveMobileVerified = (user, mobile) => {
  const entered = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!AUTH_SMS_OTP_ENABLED && isValidIndianMobile(entered)) {
    return true;
  }
  const loginMobile = String(user?.mobile || '').replace(/\D/g, '').slice(-10);
  const loginVerified =
    user?.isMobileVerified === true || user?.is_mobile_verified === 1;
  return !!(loginVerified && entered && loginMobile && entered === loginMobile);
};

const ALLOWED_EMPLOYMENT_TYPES = new Set([
  'salaried',
  'self_employed',
  'business',
  'professional',
  'other',
]);

export const normalizeEmploymentType = (value) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  return normalized || 'salaried';
};

export const validateEligibilityFields = (data) => {
  const errors = {};
  const requiredText = {
    fullName: 'Please enter your full name as per PAN.',
    companyName: 'Please enter your company name.',
    companyType: 'Please select your company type.',
    city: 'Please enter your city.',
    state: 'Please enter your state.',
    currentAddress: 'Please enter your complete home address.',
  };

  Object.entries(requiredText).forEach(([field, message]) => {
    if (!String(data[field] || '').trim()) errors[field] = message;
  });

  const fullName = String(data.fullName || '').trim();
  if (fullName.length > 0 && fullName.length < 2) {
    errors.fullName = 'Full name must contain at least 2 characters.';
  }
  if (fullName.length > 150) {
    errors.fullName = 'Full name must be 150 characters or less.';
  }
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(data.pancard || '').trim().toUpperCase())) {
    errors.pancard = 'Invalid PAN format. Correct format: ABCDE1234F';
  }
  if (!data.dob) errors.dob = 'Please select your date of birth.';
  else {
    const birth = new Date(`${data.dob}T00:00:00`);
    const todayDate = new Date();
    let age = todayDate.getFullYear() - birth.getFullYear();
    const monthDiff = todayDate.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && todayDate.getDate() < birth.getDate())) age -= 1;
    if (Number.isNaN(birth.getTime()) || data.dob > todayDate.toISOString().split('T')[0]) {
      errors.dob = 'Please select a valid date of birth.';
    } else if (age < 18 || age > 60) {
      errors.dob = 'Age must be between 18 and 60 years.';
    }
  }
  if (!['male', 'female', 'other'].includes(String(data.gender || '').toLowerCase())) {
    errors.gender = 'Please select your gender.';
  }
  if (!isStrictEmail(normalizeEmail(data.personalEmail))) {
    errors.personalEmail = 'Please enter a valid email address.';
  }
  if (!/^[6-9][0-9]{9}$/.test(String(data.mobile || '').replace(/\D/g, ''))) {
    errors.mobile = 'Please enter a valid 10-digit Indian mobile number.';
  }
  if (!ALLOWED_EMPLOYMENT_TYPES.has(normalizeEmploymentType(data.employmentType))) {
    errors.employmentType = 'Please select a valid employment type.';
  }
  if (String(data.companyName || '').trim().length > 0 && String(data.companyName).trim().length < 2) {
    errors.companyName = 'Company name must contain at least 2 characters.';
  }

  const income = Number(data.netMonthlyIncome);
  if (!Number.isFinite(income) || income < 1000) {
    errors.netMonthlyIncome = 'Minimum monthly income should be ₹1000';
  }

  const today = new Date().toISOString().split('T')[0];
  const maxSalaryDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  if (!data.nextSalaryDate) {
    errors.nextSalaryDate = 'Please select your next salary date.';
  } else if (data.nextSalaryDate < today || data.nextSalaryDate > maxSalaryDate) {
    errors.nextSalaryDate = 'Next salary date must be within the next 45 days.';
  }
  if (!data.currentJobJoiningDate) {
    errors.currentJobJoiningDate = 'Please select your current job joining date.';
  } else if (data.currentJobJoiningDate > today) {
    errors.currentJobJoiningDate = 'Current job joining date cannot be in the future.';
  }

  if (data.workExpYears === '' || data.workExpYears == null) {
    errors.workExpYears = 'Please select work experience years.';
  }
  if (data.workExpMonths === '' || data.workExpMonths == null) {
    errors.workExpMonths = 'Please select work experience months.';
  }
  if (!/^[1-9][0-9]{5}$/.test(String(data.pincode || '').trim())) {
    errors.pincode = 'Please enter a valid 6-digit pincode.';
  }
  if (String(data.currentAddress || '').trim().length > 0 && String(data.currentAddress).trim().length < 5) {
    errors.currentAddress = 'Please enter a complete address of at least 5 characters.';
  }

  return errors;
};

export const resolvePersonalEmailVerified = (user, profile, email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const profileVerified =
    profile?.personalEmailVerified === true ||
    profile?.personal_email_verified === 1;
  const profileEmail = normalizeEmail(profile?.personalEmail || profile?.personal_email);
  if (profileVerified && profileEmail === normalized) return true;

  const loginVerified =
    user?.isEmailVerified === true || user?.is_email_verified === 1;
  const loginEmail = normalizeEmail(user?.email);
  return loginVerified && loginEmail === normalized;
};
