import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PersonalEmailVerificationDialog from '@/components/auth/PersonalEmailVerificationDialog';
import MobileVerificationDialog from '@/components/auth/MobileVerificationDialog';
import MainLayout from '@/components/layouts/MainLayout';
import { 
  User, 
  Phone, 
  Mail, 
  Shield, 
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Settings,
  CreditCard,
  Lock,
  Briefcase,
  Building,
  Edit2
} from 'lucide-react';

const AUTH_SMS_OTP_ENABLED = process.env.NEXT_PUBLIC_AUTH_SMS_OTP_ENABLED !== 'false';

export default function Account() {
  const navigate = useNavigate();
  const { user: contextUser, updateUser } = useAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  // Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isMobileVerifyModalOpen, setIsMobileVerifyModalOpen] = useState(false);
  const [officeEmailInput, setOfficeEmailInput] = useState('');
  const [officeOtpStep, setOfficeOtpStep] = useState(false);
  const [officeOtp, setOfficeOtp] = useState('');
  const [officeSending, setOfficeSending] = useState(false);
  const [officeConfirming, setOfficeConfirming] = useState(false);
  const [officeError, setOfficeError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getCurrentUser();
      if (response.status === 1) {
        setUser(response.data.user || response.data);
        setProfile(response.data.profile);
        // Update context with latest user data
        if (updateUser) {
          updateUser(response.data.user || response.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const officeVerified = profile?.officeEmailVerified === true;
  const savedOfficeEmail = profile?.officeEmail || '';

  const handleSendOfficeEmail = async () => {
    const email = String(savedOfficeEmail || officeEmailInput || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOfficeError('Please enter a valid office email address.');
      return;
    }
    setOfficeError('');
    setOfficeSending(true);
    try {
      const response = await authAPI.sendOfficeEmailOTP(email);
      if (response.status === 1) {
        setOfficeOtpStep(true);
        setOfficeOtp('');
      } else {
        setOfficeError(response.message || 'Failed to send OTP');
      }
    } catch (err) {
      setOfficeError(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally {
      setOfficeSending(false);
    }
  };

  const handleConfirmOfficeEmail = async () => {
    const email = String(savedOfficeEmail || officeEmailInput || '').trim();
    if (String(officeOtp).length !== 6) {
      setOfficeError('Please enter the 6-digit OTP sent to the office email.');
      return;
    }
    setOfficeError('');
    setOfficeConfirming(true);
    try {
      const response = await authAPI.verifyOfficeEmailOTP({ email, otp: officeOtp });
      if (response.status === 1) {
        if (response.data?.profile) setProfile(response.data.profile);
        if (response.data?.user && updateUser) updateUser(response.data.user);
        setOfficeOtpStep(false);
        setOfficeOtp('');
      } else {
        setOfficeError(response.message || 'Invalid or expired OTP');
      }
    } catch (err) {
      setOfficeError(err.response?.data?.message || err.message || 'Invalid or expired OTP');
    } finally {
      setOfficeConfirming(false);
    }
  };

  const handleEditClick = () => {
    setEditForm({
      fullName: profile?.fullName || '',
      personalEmail: profile?.personalEmail || '',
      companyName: profile?.companyName || '',
      companyType: profile?.companyType || '',
      employmentType: profile?.employmentType || '',
      pancard: user?.pancard || profile?.pancard || '' // Usually read-only but adding for reference
    });
    setIsEditing(true);
  };

  const handleUpdateProfile = async () => {
    setEditLoading(true);
    try {
      const response = await authAPI.updateProfile(editForm);
      if (response.status === 1) {
        // success
        setUser(response.data.user);
        setProfile(response.data.profile);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Update failed", err);
      // You might want to show a toast here
    } finally {
      setEditLoading(false);
    }
  };

  const maskMobile = (mobile) => {
    if (!mobile || mobile.length < 4) return mobile;
    return `${mobile.slice(0, 2)}${'*'.repeat(mobile.length - 4)}${mobile.slice(-2)}`;
  };

  const maskEmail = (email) => {
    if (!email) return 'Not provided';
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visibleChars = Math.min(2, local.length);
    const masked = `${local.slice(0, visibleChars)}${'*'.repeat(Math.max(0, local.length - visibleChars))}@${domain}`;
    return masked;
  };

  const getEligibilityBadge = (status) => {
    if (status === 'eligible') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 px-3 py-1">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          Eligible
        </Badge>
      );
    } else if (status === 'not_eligible') {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 px-3 py-1">
          <XCircle className="w-3.5 h-3.5 mr-1.5" />
          Not Eligible
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 px-3 py-1">
        <FileText className="w-3.5 h-3.5 mr-1.5" />
        Not Checked
      </Badge>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner className="size-10 text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (error && !user) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-900">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  // Handle email fallback: User email -> Profile personalEmail -> Profile personal_email
  const displayEmail = user?.email || profile?.personalEmail || profile?.personal_email;

  return (
    <MainLayout>
    {/* Content */}
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                My Account
            </h1>
            <p className="mt-2 text-gray-500">
                Manage your personal verification details and account security.
            </p>
          </div>
          <Button onClick={handleEditClick} className="bg-black hover:bg-gray-800 text-white gap-2">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Personal Info (2 cols wide on large screens) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information Card */}
            <Card className="border-zinc-100 shadow-xl shadow-zinc-200/20 overflow-hidden rounded-lg">
                <CardHeader className="bg-white border-b border-zinc-50 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-950 text-white rounded-lg">
                            <User className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-zinc-900">Personal Information</CardTitle>
                          <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Verified identity details</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-50">
                        <div className="p-5 hover:bg-zinc-50/50 transition-colors">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">Full Name</p>
                            <div className="flex items-center gap-2.5">
                                <User className="w-3.5 h-3.5 text-slate-600" />
                                <p className="text-sm font-bold text-zinc-900">{profile?.fullName || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className={`p-5 transition-all duration-300 relative group ${!(user?.isMobileVerified || (!AUTH_SMS_OTP_ENABLED && user?.mobile)) ? 'bg-amber-50/30' : 'hover:bg-zinc-50/50'}`}>
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">Mobile Number</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Phone className={`w-3.5 h-3.5 ${!(user?.isMobileVerified || (!AUTH_SMS_OTP_ENABLED && user?.mobile)) ? 'text-amber-400' : 'text-slate-600'}`} />
                                    <p className={`text-sm font-bold ${!user?.mobile ? 'text-slate-500 italic' : 'text-zinc-900'}`}>
                                        {user?.mobile ? maskMobile(user.mobile) : 'Not Provided'}
                                    </p>
                                </div>
                                {user?.isMobileVerified || (!AUTH_SMS_OTP_ENABLED && user?.mobile) ? (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                    </div>
                                ) : AUTH_SMS_OTP_ENABLED ? (
                                    <Button 
                                        size="sm"
                                        className="h-7 text-[9px] font-bold text-white bg-indigo-600 px-3 rounded-lg hover:bg-indigo-700 transition-all uppercase tracking-wider shadow-md shadow-indigo-200"
                                        onClick={() => setIsMobileVerifyModalOpen(true)}
                                    >
                                        Verify Now
                                    </Button>
                                ) : null}
                            </div>
                            {!(user?.isMobileVerified || (!AUTH_SMS_OTP_ENABLED && user?.mobile)) && (
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            )}
                        </div>

                        <div className="p-5 hover:bg-zinc-50/50 transition-colors border-t border-zinc-50">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">Email Address</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                                    <p className="text-sm font-bold text-zinc-900">{maskEmail(displayEmail)}</p>
                                </div>
                                {!displayEmail ? (
                                    <div className="text-[9px] font-bold text-slate-500 bg-zinc-50 px-2 py-0.5 rounded-full uppercase">Missing</div>
                                ) : profile?.personalEmailVerified ? (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                    </div>
                                ) : (
                                    <button 
                                        className="text-[9px] font-bold text-white bg-white px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors uppercase tracking-wider"
                                        onClick={() => setIsVerifyModalOpen(true)}
                                    >
                                        Verify
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-5 hover:bg-zinc-50/50 transition-colors border-t border-zinc-50">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">Office email</p>
                            {officeVerified ? (
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                  <p className="text-sm font-bold text-zinc-900 truncate">{savedOfficeEmail}</p>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                </div>
                              </div>
                            ) : officeOtpStep ? (
                              <div className="space-y-2">
                                <p className="text-sm font-bold text-zinc-900 truncate">{savedOfficeEmail || officeEmailInput}</p>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    placeholder="OTP"
                                    value={officeOtp}
                                    onChange={(e) => {
                                      setOfficeOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                                      setOfficeError('');
                                    }}
                                    className="h-8 w-24 text-[12px] font-bold text-center"
                                    maxLength={6}
                                    inputMode="numeric"
                                    disabled={officeConfirming}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 text-[11px]"
                                    loading={officeConfirming}
                                    disabled={officeOtp.length !== 6}
                                    onClick={handleConfirmOfficeEmail}
                                  >
                                    Confirm
                                  </Button>
                                  <button
                                    type="button"
                                    className="text-[12px] font-bold text-slate-500 px-1"
                                    onClick={() => {
                                      setOfficeOtpStep(false);
                                      setOfficeOtp('');
                                      setOfficeError('');
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {savedOfficeEmail ? (
                                  <p className="text-sm font-bold text-zinc-900 truncate flex-1">{savedOfficeEmail}</p>
                                ) : (
                                  <Input
                                    placeholder="office@company.com"
                                    type="email"
                                    value={officeEmailInput}
                                    onChange={(e) => {
                                      setOfficeEmailInput(e.target.value);
                                      setOfficeError('');
                                    }}
                                    className="h-8 text-[12px] font-semibold"
                                    disabled={officeSending}
                                  />
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 shrink-0 text-[11px]"
                                  loading={officeSending}
                                  disabled={!savedOfficeEmail && !officeEmailInput}
                                  onClick={handleSendOfficeEmail}
                                >
                                  Verify
                                </Button>
                              </div>
                            )}
                            {officeError ? (
                              <p className="mt-1.5 text-[11px] font-semibold text-red-600">{officeError}</p>
                            ) : null}
                        </div>

                        <div className="p-5 hover:bg-zinc-50/50 transition-colors border-t border-zinc-50">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">PAN Card</p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-5 bg-zinc-100 rounded border border-zinc-200 flex items-center justify-center text-[8px] font-bold text-slate-500">PAN</div>
                                <p className="text-sm font-bold text-zinc-900 tracking-widest">{profile?.pancard || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

             {/* Employment Information Card */}
             <Card className="border-zinc-100 shadow-xl shadow-zinc-200/20 overflow-hidden rounded-lg">
                <CardHeader className="bg-white border-b border-zinc-50 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 text-slate-500 rounded-lg">
                            <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-zinc-900">Employment Details</CardTitle>
                          <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Professional & company info</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-50">
                        <div className="p-5 hover:bg-zinc-50/50 transition-colors">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">Company Name</p>
                            <div className="flex items-center gap-2.5">
                                <Building className="w-3.5 h-3.5 text-slate-600" />
                                <p className="text-sm font-bold text-zinc-900 truncate">{profile?.companyName || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="p-5 hover:bg-zinc-50/50 transition-colors">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">Industry</p>
                            <div className="flex items-center gap-2.5">
                                <Building className="w-3.5 h-3.5 text-slate-600" />
                                <p className="text-sm font-bold text-zinc-900">{profile?.companyType || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="p-5 hover:bg-zinc-50/50 transition-colors">
                            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">Employment</p>
                            <div className="flex items-center gap-2.5">
                                <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                                <p className="text-sm font-bold text-zinc-900 capitalize">{profile?.employmentType || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

             {/* Account Statistics */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <Card className="border-gray-100 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                     <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                             <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                 <CreditCard className="w-5 h-5" />
                             </div>
                             {getEligibilityBadge(profile?.eligibilityStatus)}
                         </div>
                         <p className="text-sm text-gray-500 font-medium">Max Loan Limit</p>
                         <h3 className="text-2xl font-bold text-gray-900 mt-1">
                             {profile?.maxLoanAmount ? `₹${profile.maxLoanAmount.toLocaleString()}` : '₹0'}
                         </h3>
                     </CardContent>
                 </Card>

                 <Card className="border-gray-100 shadow-sm">
                     <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                 <Calendar className="w-5 h-5" />
                             </div>
                         </div>
                         <p className="text-sm text-gray-500 font-medium">Member Since</p>
                         <h3 className="text-lg font-bold text-gray-900 mt-1">
                             {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                                 month: 'long', year: 'numeric' 
                             }) : 'N/A'}
                         </h3>
                     </CardContent>
                 </Card>
             </div>
          </div>

          {/* Right Column: Security & Status */}
          <div className="space-y-8">
            {/* Account Status */}
            <Card className="border-gray-100 shadow-lg shadow-gray-100/50 h-fit">
                <CardHeader className="bg-white border-b border-gray-50 pb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Shield className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg font-bold text-gray-900">Security & Status</CardTitle>
                    </div>
                    <CardDescription>Manage account security.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-900">Account Status</p>
                            <p className="text-xs text-gray-500">Current state of your account</p>
                        </div>
                        <Badge
                            className={`${
                            user?.status === 'active'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700'
                            } border-0 px-2.5 py-1`}
                        >
                            {user?.status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                    </div>
                    
                    <div className="h-px bg-gray-100" />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-900">Login Security</p>
                            <p className="text-xs text-gray-500">Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-md">
                             <Lock className="w-3 h-3" />
                             Secure
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium text-gray-900">Two-Factor Auth</p>
                                <p className="text-xs text-gray-500">Enhanced security layer</p>
                            </div>
                            {user?.twoFactorEnabled ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-gray-300" />
                            )}
                        </div>
                        <Button 
                            variant="outline" 
                            className="w-full justify-between"
                            onClick={() => navigate('/account/2fa')}
                        >
                            Manage 2FA <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your personal and professional information.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fullName" className="text-right">
                            Full Name
                        </Label>
                        <Input
                            id="fullName"
                            value={editForm.fullName}
                            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            value={editForm.personalEmail}
                            onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="companyName" className="text-right">
                            Company
                        </Label>
                        <Input
                            id="companyName"
                            value={editForm.companyName}
                            onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="companyType" className="text-right">
                            Industry
                        </Label>
                        <select
                            id="companyType"
                            value={editForm.companyType || ''}
                            onChange={(e) => setEditForm({ ...editForm, companyType: e.target.value })}
                            className="col-span-3 h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="" disabled>Select type</option>
                            <option value="IT_SERVICES">IT Services</option>
                            <option value="MANUFACTURING">Manufacturing</option>
                            <option value="BANKING">Banking/Finance</option>
                            <option value="RETAIL">Retail</option>
                            <option value="STARTUP">Startup</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="employmentType" className="text-right">
                            Employment
                        </Label>
                        <select
                            id="employmentType"
                            value={editForm.employmentType || ''}
                            onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                            className="col-span-3 h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="" disabled>Select type</option>
                            <option value="salaried">Salaried</option>
                            <option value="self_employed">Self Employed</option>
                            <option value="government">Government</option>
                            <option value="business">Business Owner</option>
                        </select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleUpdateProfile} disabled={editLoading} loading={editLoading}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Email Verification Dialog */}
        <PersonalEmailVerificationDialog 
            isOpen={isVerifyModalOpen}
            onClose={() => setIsVerifyModalOpen(false)}
            email={displayEmail}
            onSuccess={fetchUserData}
        />

        {/* Mobile Verification Dialog */}
        <MobileVerificationDialog 
            isOpen={AUTH_SMS_OTP_ENABLED && isMobileVerifyModalOpen}
            onClose={() => setIsMobileVerifyModalOpen(false)}
            initialMobile={user?.mobile}
            onSuccess={fetchUserData}
        />
    </MainLayout>
  );
}
