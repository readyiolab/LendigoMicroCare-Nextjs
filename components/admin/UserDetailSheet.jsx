import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { getStatusBadge } from '@/utils/statusUtils';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  Wallet,
  ExternalLink,
  Smartphone,
  Briefcase,
  Building,
  IndianRupee,
  Users
} from 'lucide-react';
import { useNavigate } from '@/lib/router';
import LoanBreakdownInline from './LoanBreakdownInline';
import UserCreditPolicyPanel from '@/components/admin/users/UserCreditPolicyPanel';

export default function UserDetailSheet({ userId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLoanId, setExpandedLoanId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && userId) {
      fetchUser();
    } else {
        setData(null);
        setLoading(true);
        setError('');
        setExpandedLoanId(null);
    }
  }, [isOpen, userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUserCompleteDetails(userId);
      if (response.status === 1) {
        setData(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const toggleLoan = (id) => {
    if (expandedLoanId === id) {
        setExpandedLoanId(null);
    } else {
        setExpandedLoanId(id);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      active: 'default',
      blocked: 'destructive',
      inactive: 'secondary',
    };
    return (
        <Badge variant={map[status] || 'secondary'} className="capitalize">
            {status}
        </Badge>
    );
  };
  
  const getAppStatusBadge = (status) => {
    const config = {
      under_review: { icon: Clock, className: 'bg-amber-100 text-amber-800' },
      approved: { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800' },
      rejected: { icon: XCircle, className: 'bg-red-100 text-red-800' },
      disbursed: { icon: CheckCircle2, className: 'bg-purple-100 text-purple-800' },
      closed: { icon: ShieldCheck, className: 'bg-gray-200 text-gray-800' },
    };
    const item = config[status] || { icon: Clock, className: 'bg-gray-100 text-gray-800' };
    const Icon = item.icon;
    
    return (
        <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${item.className}`}>
            <Icon className="w-3 h-3" />
            <span className="capitalize">{status?.replace(/_/g, ' ')}</span>
        </span>
    );
  };

  const { user, profile, applications, referrals, summary } = data || {};
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[95%] sm:max-w-[600px] overflow-y-auto p-0 gap-0 border-l border-gray-200 shadow-2xl">
            {/* Header - Always Visible (with fallback data) */}
            <div className="px-4 py-5 bg-white border-b border-gray-100 sticky top-0 z-10">
               <div className="flex items-start justify-between mb-2">
                 <div>
                    <SheetTitle className="text-2xl font-bold text-gray-900">
                      {loading ? 'Loading...' : !data ? 'User Not Found' : (profile?.full_name || user?.mobile || 'User Profile')}
                    </SheetTitle>
                    <SheetDescription className="text-xs font-medium text-gray-500 mt-0.5 flex items-center gap-1.5">
                       {loading || !data ? (
                         <span>Please wait...</span>
                       ) : (
                         <>
                             Joined {new Date(user.createdAt || user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                         </>
                       )}
                    </SheetDescription>
                    {data && user && <div className="mt-3">{getStatusBadge(user.status)}</div>}
                 </div>
               </div>
            </div>

            {/* Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <Spinner className="h-8 w-8 text-blue-600" />
                    <p className="text-sm font-medium text-gray-600 animate-pulse">Loading user profile...</p>
                </div>
            ) : !data ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-4">
                    <div className="rounded-full bg-red-50 p-4">
                    <User className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-base font-semibold text-gray-900">User not found</p>
                        <p className="text-sm font-medium text-gray-600 max-w-xs mx-auto">{error || 'Could not retrieve details'}</p>
                    </div>
                </div>
            ) : (
                <>
                {error && <Alert variant="destructive" className="bg-red-50 border-red-100"><AlertDescription className="text-red-900">{error}</AlertDescription></Alert>}

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-100/60 p-1 h-auto rounded-lg mb-6 border border-gray-200/50 shadow-sm">
                    <TabsTrigger 
                        value="overview" 
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg py-2 font-semibold transition-all duration-300 text-xs uppercase"
                    >
                        Profile Overview
                    </TabsTrigger>
                    <TabsTrigger 
                        value="applications" 
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg py-2 font-semibold transition-all duration-300 text-xs uppercase"
                    >
                        Apps ({applications?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                        value="referrals" 
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg py-2 font-semibold transition-all duration-300 text-xs uppercase"
                    >
                        Referrals ({referrals?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                        value="credit" 
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg py-2 font-semibold transition-all duration-300 text-xs uppercase"
                    >
                        Credit
                    </TabsTrigger>
                  </TabsList>

                  {/* ──────────────── OVERVIEW ──────────────── */}
                  <TabsContent value="overview" className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                     
                     {/* 1. User Summary Card */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative overflow-hidden bg-white rounded-lg p-4 border border-gray-100 shadow-sm group hover:shadow-md transition-all">
                             <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Total Applications</p>
                             <p className="text-2xl font-bold text-gray-900 leading-none">{summary?.totalApplications || 0}</p>
                        </div>
                        <div className="relative overflow-hidden bg-white rounded-lg p-4 border border-gray-100 shadow-sm group hover:shadow-md transition-all">
                             <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Active Loans</p>
                             <p className="text-2xl font-bold text-gray-900 leading-none">{summary?.activeApplication ? 1 : 0}</p>
                        </div>
                        <div className="relative overflow-hidden bg-white rounded-lg p-4 border border-gray-100 shadow-sm group hover:shadow-md transition-all">
                             <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Referrals</p>
                             <p className="text-2xl font-bold text-gray-900 leading-none">{summary?.referralCount || 0}</p>
                        </div>
                        <div className="relative overflow-hidden bg-blue-600 rounded-lg p-4 border border-blue-700 shadow-sm group hover:bg-blue-700 transition-all">
                             <p className="text-[10px] text-blue-100 uppercase font-semibold mb-1">Rewards Earned</p>
                             <p className="text-2xl font-bold text-white leading-none">₹{summary?.totalReferralRewards?.toLocaleString() || '0'}</p>
                        </div>
                      </div>

                     <Separator className="bg-gray-100" />

                     {/* 2. Personal Details */}
                     <div className="space-y-3">
                       <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide flex items-center gap-2">
                         <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500"><User className="w-4 h-4" /></div>
                         Identity & KYC
                       </h3>
                       
                       <div className="grid gap-3">
                            {/* Name */}
                            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-gray-50 group-hover:bg-blue-50 rounded-lg transition-colors"><User className="w-4 h-4 text-gray-400 group-hover:text-blue-500" /></div>
                                  <div>
                                     <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal">Full Name</p>
                                     <p className="text-sm font-semibold text-gray-900">{profile?.full_name || 'Not provided'}</p>
                                  </div>
                               </div>
                            </div>
                            
                             {/* Mobile */}
                            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-gray-50 group-hover:bg-blue-50 rounded-lg transition-colors"><Smartphone className="w-4 h-4 text-gray-400 group-hover:text-blue-500" /></div>
                                  <div>
                                     <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal">Mobile Number</p>
                                     <p className="text-sm font-semibold text-gray-900">{user.mobile}</p>
                                  </div>
                               </div>
                               {user.status === 'active' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[9px]">MOBILE VERIFIED</Badge>}
                            </div>

                             {/* Email */}
                            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-gray-50 group-hover:bg-blue-50 rounded-lg transition-colors"><Mail className="w-4 h-4 text-gray-400 group-hover:text-blue-500" /></div>
                                  <div>
                                     <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal">Email Address</p>
                                     <p className="text-sm font-semibold text-gray-900 lowercase">{profile?.personal_email || user.email || '—'}</p>
                                  </div>
                               </div>
                            </div>

                            {/* PAN */}
                            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-gray-50 group-hover:bg-blue-50 rounded-lg transition-colors"><CreditCard className="w-4 h-4 text-gray-400 group-hover:text-blue-500" /></div>
                                  <div>
                                     <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal">PAN Card</p>
                                     <p className="text-sm font-semibold text-gray-900 tracking-wide">{profile?.pancard || 'Not Provided'}</p>
                                  </div>
                               </div>
                               <Badge variant={profile?.eligibility_status === 'eligible' ? 'default' : 'outline'} className="font-semibold text-[9px] uppercase shadow-sm">
                                 {profile?.eligibility_status || 'Pending'}
                                </Badge>
                            </div>
                       </div>
                    </div>

                    {/* Employment Details Section */}
                     <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide flex items-center gap-2">
                          <div className="p-1.5 bg-purple-50 rounded-lg text-purple-500"><Briefcase className="w-4 h-4" /></div>
                          Employment Summary
                        </h3>
                       
                       <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg border border-gray-100 bg-white group hover:border-purple-200 transition-all">
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal mb-1">Company</p>
                                    <p className="text-xs font-semibold text-gray-900 line-clamp-1">{profile?.company_name || '—'}</p>
                                </div>
                                <div className="p-3 rounded-lg border border-gray-100 bg-white group hover:border-purple-200 transition-all">
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal mb-1">Status</p>
                                    <p className="text-xs font-semibold text-gray-900 capitalize">{profile?.employment_type?.replace(/_/g, ' ') || '—'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg border border-gray-100 bg-white group hover:border-purple-200 transition-all">
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal mb-1">UAN</p>
                                <p className="text-xs font-mono text-gray-900">{profile?.uan || user?.uan || '—'}</p>
                              </div>
                              <div className="p-3 rounded-lg border border-gray-100 bg-white group hover:border-purple-200 transition-all">
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal mb-1">Current Employer</p>
                                <p className="text-xs font-semibold text-gray-900">{profile?.company_name || '—'}</p>
                              </div>
                            </div>

                             <div className="flex items-center justify-between p-4 rounded-lg bg-purple-600 border border-purple-700 shadow-sm">
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-white/10 rounded-lg"><IndianRupee className="w-4 h-4 text-white" /></div>
                                  <div>
                                     <p className="text-[10px] text-purple-100 font-semibold uppercase tracking-normal">Monthly Take Home</p>
                                     <p className="text-lg font-bold text-white">₹{parseInt(profile?.net_monthly_income || 0).toLocaleString()}</p>
                                  </div>
                               </div>
                               <Badge variant="outline" className="text-white border-white/30 font-semibold text-[9px]">SALARY CREDITED</Badge>
                             </div>

                            {profile?.current_job_joining_date && (
                             <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-purple-200 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-gray-50 rounded-lg"><Calendar className="w-4 h-4 text-gray-400" /></div>
                                  <div>
                                     <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-normal">Joined Company</p>
                                     <p className="text-sm font-semibold text-gray-900">
                                       {new Date(profile.current_job_joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                     </p>
                                  </div>
                               </div>
                             </div>
                            )}
                       </div>
                    </div>
                     
                  </TabsContent>

                  {/* ──────────────── APPLICATIONS ──────────────── */}
                  <TabsContent value="applications" className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-gray-50/50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 text-[11px] uppercase tracking-wide flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500"><Wallet className="w-4 h-4" /></div>
                            History
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-100 bg-white">
                             {applications?.length === 0 ? (
                                <div className="text-center py-16">
                                   <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                                       <FileText className="w-8 h-8 text-gray-300" />
                                   </div>
                                   <p className="text-sm font-bold text-gray-900">NO LOANS FOUND</p>
                                   <p className="text-xs text-gray-400 mt-1 uppercase tracking-tight">User has no past application records</p>
                                </div>
                             ) : (
                                applications?.map((app) => (
                                    <div 
                                        key={app.id} 
                                        className={`p-4 hover:bg-gray-50/50 transition-all group cursor-pointer border-b border-gray-100 last:border-0 ${expandedLoanId === app.id ? 'bg-blue-50/30' : ''}`}
                                        onClick={() => toggleLoan(app.id)}
                                    >
                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <p className="text-[9px] font-bold font-mono text-gray-400">#{app.application_number || app.id}</p>
                                                {getAppStatusBadge(app.application_status)}
                                            </div>

                                            <div className="space-y-0.5">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-normal">Amount & Purpose</p>
                                                <p className="text-xl font-bold text-gray-900 tracking-tight">₹{parseInt(app.principal_amount || 0).toLocaleString()}</p>
                                                <p className="text-xs text-gray-500 font-semibold uppercase">{app.tenure_days} Days <span className="text-gray-300 mx-1">•</span> {app.purpose?.replace(/_/g, ' ')}</p>
                                            </div>

                                            <div className="space-y-0.5">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-normal">Submission Date</p>
                                                <p className="text-xs font-semibold text-gray-800">
                                                    {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Inline Breakdown */}
                                        {expandedLoanId === app.id && (
                                            <LoanBreakdownInline application={app} />
                                        )}
                                    </div>
                                ))
                             )}
                        </div>
                      </div>
                  </TabsContent>
                  {/* ──────────────── REFERRALS ──────────────── */}
                  <TabsContent value="referrals" className="space-y-4 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-gray-50/50 border-b border-gray-100 px-4 py-3">
                          <h3 className="font-bold text-gray-900 text-[11px] uppercase tracking-wide flex items-center gap-2">
                            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500"><Users className="w-4 h-4" /></div>
                            Partner Network
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-100 bg-white">
                             {referrals?.length === 0 ? (
                                <div className="text-center py-16">
                                   <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                                       <Users className="w-8 h-8 text-gray-300" />
                                   </div>
                                   <p className="text-sm font-bold text-gray-900">NETWORK IS EMPTY</p>
                                   <p className="text-xs text-gray-400 mt-1 uppercase tracking-tight">Try encouraging the user to refer friends</p>
                                </div>
                             ) : (
                                referrals?.map((ref, idx) => (
                                    <div key={idx} className="p-4 hover:bg-gray-50/50 transition-all flex items-center justify-between border-b border-gray-100 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {ref.referred_name?.split(' ').map(n=>n[0]).join('') || '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{ref.referred_name || 'Anonymous User'}</p>
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase">
                                                  Joined {new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={ref.status === 'rewarded' ? 'default' : 'outline'} className="mb-1 block w-fit ml-auto text-[8px] font-bold uppercase">
                                                {ref.status}
                                            </Badge>
                                            <p className="text-sm font-bold text-emerald-600">
                                                {ref.status === 'rewarded' ? `+ ₹${ref.discount_amount}` : 'PENDING'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                             )}
                        </div>
                      </div>
                  </TabsContent>

                  <TabsContent value="credit" className="focus-visible:outline-none animate-in fade-in duration-300">
                    <UserCreditPolicyPanel userId={userId} />
                  </TabsContent>
                </Tabs>
                </>
            )}
            </div>
      </SheetContent>
    </Sheet>
  );
}
