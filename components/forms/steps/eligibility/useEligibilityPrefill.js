import { useEffect } from 'react';
import { authAPI, adminAPI } from '@/lib/api';
import {
  normalizeEmploymentType,
  resolveMobileVerified,
  resolvePersonalEmailVerified,
} from './validateEligibility';

export function useEligibilityPrefill({
  applicationData,
  isReturningUser,
  previousProfile,
  isAdminMode,
  targetUserId,
  applicationId,
  authUser,
  setFormData,
  setIsEmailVerified,
  setIsMobileVerified,
  setLoginMobile,
  setWorkflowStatus,
  setWorkflowDetails,
}) {
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1. Priority: Use data from applicationData if available (for "Modify" from Review)
        if (applicationData?.profile) {
           const p = applicationData.profile;
           const getVal = (keySnake, keyCamel) => {
             if (p[keySnake] !== undefined && p[keySnake] !== null) return p[keySnake];
             if (p[keyCamel] !== undefined && p[keyCamel] !== null) return p[keyCamel];
             return '';
           };

           let expYears = getVal('work_experience_years', 'workExpYears');
           let expMonths = getVal('work_experience_months', 'workExpMonths');
           const totalMonths = getVal('total_work_experience_months', 'totalWorkExperienceMonths');

           if (expYears === '' && (totalMonths !== undefined && totalMonths !== null && totalMonths !== '')) {
               const total = parseInt(totalMonths);
               expYears = String(Math.floor(total / 12));
               expMonths = String(total % 12);
           }

           setFormData(prev => ({
             ...prev,
             fullName: getVal('full_name', 'fullName'),
             pancard: getVal('pancard'),
             dob: getVal('dob') ? getVal('dob').split('T')[0] : '',
             gender: getVal('gender') || 'male',
             personalEmail: getVal('personal_email', 'personalEmail'),
             mobile: getVal('mobile'),
             employmentType: normalizeEmploymentType(getVal('employment_type', 'employmentType')),
             companyName: getVal('company_name', 'companyName'),
             companyType: getVal('company_type', 'companyType'),
             currentJobJoiningDate: getVal('current_job_joining_date', 'currentJobJoiningDate') ? getVal('current_job_joining_date', 'currentJobJoiningDate').split('T')[0] : '',
             workExpYears: String(expYears),
             workExpMonths: String(expMonths),
             nextSalaryDate: getVal('next_salary_date', 'nextSalaryDate') ? getVal('next_salary_date', 'nextSalaryDate').split('T')[0] : '',
             netMonthlyIncome: String(getVal('net_monthly_income', 'netMonthlyIncome')),
             pincode: getVal('pincode'),
             state: getVal('state'),
             city: getVal('city'),
             currentAddress: getVal('current_address', 'currentAddress'),
           }));

           const nextEmail = getVal('personal_email', 'personalEmail');
           const nextMobile = getVal('mobile');
           setIsEmailVerified(
             getVal('personal_email_verified', 'personalEmailVerified') === 1 ||
             resolvePersonalEmailVerified(authUser, p, nextEmail)
           );
           setIsMobileVerified(resolveMobileVerified(authUser, nextMobile));

           if (p.wf_status) {
              setWorkflowStatus(p.wf_status);
              setWorkflowDetails({
                 reasonCode: p.wf_reason_code,
                 customerMessage: p.wf_customer_message,
                 retryCount: p.wf_retry_count || 0,
                 maxRetry: p.wf_max_retry || 3,
                 editableFields: p.wf_editable_fields || []
              });
           }
           return;
        }

        let userData;
        if (isAdminMode && targetUserId) {
          const response = await adminAPI.getApplicationDetails(applicationId);
          if (response.status === 1) {
            userData = {
              user: response.data.application,
              profile: response.data.profile
            };
          }
        } else {
          const response = await authAPI.getCurrentUser();
          if (response.status === 1) {
            userData = response.data;
          }
        }

        if (userData) {
          const userEmail = userData.user?.email || userData.profile?.personalEmail || userData.profile?.personal_email || '';
          const userPan = userData.profile?.pancard || '';

          if (userData.profile && userData.profile.wf_status) {
             setWorkflowStatus(userData.profile.wf_status);
             setWorkflowDetails({
                reasonCode: userData.profile.wf_reason_code,
                customerMessage: userData.profile.wf_customer_message,
                retryCount: userData.profile.wf_retry_count || 0,
                maxRetry: userData.profile.wf_max_retry || 3,
                editableFields: userData.profile.wf_editable_fields || []
             });
          }

          const profileSource = (isReturningUser && previousProfile) ? previousProfile : (isAdminMode && userData.profile ? userData.profile : null);

          if (profileSource) {
            const getVal = (keyCamel, keySnake) => {
                if (profileSource[keyCamel] !== undefined && profileSource[keyCamel] !== null) return profileSource[keyCamel];
                if (keySnake && profileSource[keySnake] !== undefined && profileSource[keySnake] !== null) return profileSource[keySnake];
                return '';
            };

            let expYears = getVal('workExpYears', 'work_experience_years');
            let expMonths = getVal('workExpMonths', 'work_experience_months');

            const totalMonths = getVal('totalWorkExperienceMonths', 'total_work_experience_months');

            // Force calculation if values are logically missing or if we only have totalMonths
            if ((expYears === '' || expYears === null || expYears === 0 || expYears === '0') &&
                (totalMonths !== undefined && totalMonths !== null && totalMonths !== '')) {
                const total = parseInt(totalMonths);
                expYears = String(Math.floor(total / 12));
                expMonths = String(total % 12);
            }

            setFormData(prev => ({
              ...prev,
              fullName: getVal('fullName', 'full_name') || prev.fullName,
              pancard: getVal('pancard', 'pancard') || userPan || prev.pancard,
              dob: getVal('dob', 'dob') ? String(getVal('dob', 'dob')).split('T')[0] : prev.dob,
              gender: getVal('gender', 'gender') || prev.gender,
              personalEmail: getVal('personalEmail', 'personal_email') || userEmail || prev.personalEmail,
              mobile: getVal('mobile', 'mobile') || userData.user?.mobile || prev.mobile,
              employmentType: normalizeEmploymentType(getVal('employmentType', 'employment_type') || prev.employmentType),
              companyName: getVal('companyName', 'company_name') || prev.companyName,
              companyType: getVal('companyType', 'company_type') || prev.companyType,
              currentJobJoiningDate: getVal('currentJobJoiningDate', 'current_job_joining_date') ? String(getVal('currentJobJoiningDate', 'current_job_joining_date')).split('T')[0] : prev.currentJobJoiningDate,
              workExpYears: expYears !== '' ? String(expYears) : '0',
              workExpMonths: expMonths !== '' ? String(expMonths) : '0',
              nextSalaryDate: getVal('nextSalaryDate', 'next_salary_date') ? String(getVal('nextSalaryDate', 'next_salary_date')).split('T')[0] : prev.nextSalaryDate,
              netMonthlyIncome: getVal('netMonthlyIncome', 'net_monthly_income') || prev.netMonthlyIncome,
              pincode: getVal('pincode', 'pincode') || prev.pincode,
              state: getVal('state', 'state') || prev.state,
              city: getVal('city', 'city') || prev.city,
              currentAddress: getVal('currentAddress', 'current_address') || prev.currentAddress,
            }));

            setIsEmailVerified(
              resolvePersonalEmailVerified(userData.user, profileSource || userData.profile, getVal('personalEmail', 'personal_email') || userEmail)
            );
            setLoginMobile(userData.user?.mobile || '');
            setIsMobileVerified(
              resolveMobileVerified(
                userData.user,
                getVal('mobile', 'mobile') || userData.user?.mobile
              )
            );

          } else {
            const nextEmail = userEmail || '';
            const nextMobile = userData.user?.mobile || '';
            setFormData(prev => ({
              ...prev,
              personalEmail: nextEmail || prev.personalEmail,
              pancard: userPan || prev.pancard,
              mobile: nextMobile || prev.mobile,
            }));
            setLoginMobile(nextMobile);
            setIsEmailVerified(
              resolvePersonalEmailVerified(userData.user, userData.profile, nextEmail)
            );
            setIsMobileVerified(resolveMobileVerified(userData.user, nextMobile));
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };

    fetchUserData();
  }, [
    isReturningUser,
    previousProfile,
    isAdminMode,
    targetUserId,
    applicationId,
    applicationData,
    authUser,
    setFormData,
    setIsEmailVerified,
    setIsMobileVerified,
    setLoginMobile,
    setWorkflowStatus,
    setWorkflowDetails,
  ]);
}
