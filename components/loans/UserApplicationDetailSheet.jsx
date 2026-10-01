import { useState, useEffect } from 'react';
import { loanAPI, documentsAPI, kycAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { getStatusBadge } from '@/utils/statusUtils';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CheckCircle2, FileText, Download, ExternalLink, Calendar, Banknote, XCircle, Clock, Loader2, Fingerprint } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  downloadAllApplicationDocuments,
  errorMessageFromBlobResponse,
} from '@/utils/downloadAllDocuments';

export default function UserApplicationDetailSheet({ applicationId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [repayments, setRepayments] = useState([]);
  const [repaymentsLoading, setRepaymentsLoading] = useState(false);
  const [repaymentsLoaded, setRepaymentsLoaded] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [ekycLoading, setEkycLoading] = useState(false);
  const [ekycMessage, setEkycMessage] = useState('');

  useEffect(() => {
    if (isOpen && applicationId) {
      setActiveTab('overview');
      setRepayments([]);
      setRepaymentsLoaded(false);
      setKycStatus(null);
      setEkycMessage('');
      fetchApplication();
      fetchKycStatus();
    } else {
        setData(null);
        setRepayments([]);
        setRepaymentsLoaded(false);
        setLoading(true);
        setError('');
        setKycStatus(null);
        setEkycMessage('');
    }
  }, [isOpen, applicationId]);

  useEffect(() => {
    if (
      isOpen &&
      applicationId &&
      activeTab === 'repayments' &&
      !repaymentsLoaded &&
      data?.view === 'active_loan'
    ) {
      fetchRepayments(applicationId);
    }
  }, [activeTab, isOpen, applicationId, repaymentsLoaded, data?.view]);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const response = await loanAPI.getApplicationDetails(applicationId);
      if (response.status === 1) {
         setData(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const res = await kycAPI.getKYCStatus();
      if (res.status === 1) {
        setKycStatus(res.data || null);
      }
    } catch {
      /* CTA hidden if status unavailable */
    }
  };

  const handleStartEkyc = async () => {
    setEkycLoading(true);
    setEkycMessage('');
    setError('');
    try {
      const response = await kycAPI.customerInitiateDigilocker(applicationId);
      if (response.status !== 1) {
        setError(response.message || 'Failed to start eKYC');
        return;
      }
      const payload = response.data || {};
      if (payload.alreadyVerified) {
        setKycStatus((prev) => ({ ...(prev || {}), status: 'verified' }));
        setEkycMessage(payload.message || 'eKYC already completed.');
        return;
      }
      const url = payload.accessUrl || payload.kycUrl;
      if (!url) {
        setError('DigiLocker link was not returned. Please try again.');
        return;
      }
      setKycStatus((prev) => ({ ...(prev || {}), status: 'initiated', accessUrl: url }));
      window.location.assign(url);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start eKYC');
    } finally {
      setEkycLoading(false);
    }
  };

  const fetchRepayments = async (id) => {
      setRepaymentsLoading(true);
      try {
          const res = await loanAPI.getRepaymentDetails(id);
          if (res.status === 1) {
              setRepayments(res.data.emis || []);
              setRepaymentsLoaded(true);
          }
      } catch (e) {
          console.error("Failed to fetch repayments", e);
      } finally {
          setRepaymentsLoading(false);
      }
  };

  const getStatusBadge = (status) => {
    // ... existing ...
    const config = {
      draft: { variant: 'secondary', label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      submitted: { variant: 'outline', label: 'Submitted', className: 'border-blue-200 text-blue-700 bg-blue-50' },
      under_review: { variant: 'default', label: 'Under Review', className: 'bg-amber-100 text-amber-800' },
      approved: { variant: 'default', label: 'Approved', className: 'bg-emerald-100 text-emerald-800' },
      rejected: { variant: 'destructive', label: 'Rejected', className: 'bg-red-100 text-red-800' },
      offer_sent: { variant: 'default', label: 'Offer Sent', className: 'bg-blue-100 text-blue-800' }, // Added offer_sent
      offer_accepted: { variant: 'default', label: 'Offer Accepted', className: 'bg-green-100 text-green-800' },
      video_declaration_pending: { variant: 'outline', label: 'Video Pending', className: 'bg-orange-50 text-orange-700' },
      video_declaration_submitted: { variant: 'default', label: 'Video Submitted', className: 'bg-amber-100 text-amber-800' },
      video_declaration_rejected: { variant: 'destructive', label: 'Video Rejected', className: 'bg-red-100 text-red-800' },
      esign_completed: { variant: 'default', label: 'E-Sign Done', className: 'bg-indigo-100 text-indigo-800' },
      disbursed: { variant: 'default', label: 'Disbursed', className: 'bg-purple-100 text-purple-800' },
      closed: { variant: 'secondary', label: 'Closed', className: 'bg-gray-200 text-gray-800' },
      defaulted: { variant: 'destructive', label: 'Defaulted', className: 'bg-red-900 text-white' },
    };
    // ... existing ...
    const item = config[status] || { variant: 'secondary', label: status };
    return (
      <Badge variant={item.variant} className={`text-xs px-2 py-0.5 font-medium border-0 ${item.className}`}>
        {item.label}
      </Badge>
    );
  };

  const {
    application: loanApp,
    residenceProofs,
    bankStatements,
    esignDocuments,
    bankDetails,
    salarySlips,
    disbursements,
    repaymentSummary,
    view: detailView,
  } = data || {};

  const isActiveLoan = detailView === 'active_loan';
  const showRepayments = isActiveLoan;
  const showDocumentsTab = !isActiveLoan;

  const hasDownloadableDocs = Boolean(
    residenceProofs?.some((d) => d.document_url) ||
      bankStatements?.some((d) => d.statement_url) ||
      salarySlips?.some((d) => d.file_url) ||
      esignDocuments?.some((d) => d.signed_document_url || d.document_url)
  );

  const handleDownloadAll = async () => {
    const appRef = loanApp?.id || applicationId;
    if (!appRef) return;
    setDownloadingAll(true);
    setError('');
    try {
      await downloadAllApplicationDocuments(appRef, loanApp?.application_number || appRef);
    } catch (err) {
      const message = await errorMessageFromBlobResponse(err, 'Failed to download all documents');
      setError(message);
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[95%] sm:max-w-[600px] overflow-y-auto p-0 gap-0 border-l border-gray-200 shadow-2xl">
        {loading ? (
            // ... existing loading ...
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Spinner className="h-8 w-8 text-blue-600" />
            <p className="text-sm text-gray-500 animate-pulse">Loading application...</p>
          </div>
        ) : !data ? (
            // ... existing error ...
           <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-6">
             <div className="rounded-full bg-red-50 p-4">
               <FileText className="h-8 w-8 text-red-500" />
             </div>
             <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">Application not found</p>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">{error || 'Could not retrieve details'}</p>
             </div>
           </div>
        ) : (
          <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header */}
            <div className="px-6 py-5 bg-white border-b border-gray-100 sticky top-0 z-10">
               <div className="flex items-start justify-between mb-2">
                 <div>
                   <SheetTitle className="text-xl font-bold text-gray-900 flex items-center gap-2 font-mono">
                     {loanApp.loan_account_number || loanApp.lead_id || 'Loan details'}
                   </SheetTitle>
                   <SheetDescription className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Applied on {new Date(loanApp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                   </SheetDescription>
                 </div>
                 {getStatusBadge(loanApp.application_status, loanApp.mandate_status)}
               </div>
            </div>

            {/* Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-auto bg-white border border-gray-200 p-1 h-auto rounded-lg mb-6 shadow-sm flex">
                    <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 rounded-lg py-2">Overview</TabsTrigger>
                    {['offer_sent', 'offer_accepted', 'esign_completed', 'disbursed', 'closed', 'defaulted'].includes(loanApp.application_status) && (
                        <TabsTrigger value="breakdown" className="flex-1 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 rounded-lg py-2">Breakdown</TabsTrigger>
                    )}
                    {showDocumentsTab && (
                      <TabsTrigger value="documents" className="flex-1 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 rounded-lg py-2">Documents</TabsTrigger>
                    )}
                    {showRepayments && (
                         <TabsTrigger value="repayments" className="flex-1 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 rounded-lg py-2">Repayments</TabsTrigger>
                    )}
                  </TabsList>

                  {/* ──────────────── OVERVIEW ──────────────── */}
                  <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
                     {/* ... Overview Content ... */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                           <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                {['approved', 'offer_sent', 'offer_accepted', 'disbursed', 'mandate_pending', 'video_declaration_pending', 'video_declaration_submitted', 'video_declaration_rejected', 'esign_completed'].includes(loanApp.application_status) ? 'Approved Amount' : 'Requested Amount'}
                           </p>
                           <p className="text-2xl font-bold text-gray-900">
                                ₹{parseInt(loanApp.approved_amount || loanApp.principal_amount || 0).toLocaleString()}
                           </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                           <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Duration</p>
                           <p className="text-2xl font-bold text-gray-900">{loanApp.tenure_days} <span className="text-sm font-normal text-gray-400">days</span></p>
                        </div>
                     </div>

                     {(() => {
                       const st = String(kycStatus?.status || 'not_started').toLowerCase();
                       const showEkycCta = st !== 'verified' && st !== 'success' && st !== 'completed';
                       if (!showEkycCta && !ekycMessage) return null;
                       return (
                         <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 space-y-3">
                           <div className="flex items-start gap-3">
                             <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                               <Fingerprint className="w-4.5 h-4.5 text-zinc-800" />
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-semibold text-gray-900">eKYC (DigiLocker)</p>
                               <p className="text-xs text-gray-500 mt-0.5">
                                 {st === 'verified'
                                   ? 'Aadhaar eKYC is verified.'
                                   : ['initiated', 'pending'].includes(st)
                                     ? 'DigiLocker session in progress. Continue to finish Aadhaar and PAN consent.'
                                     : 'Complete Aadhaar + PAN verification via DigiLocker.'}
                               </p>
                               {ekycMessage && (
                                 <p className="text-xs text-emerald-700 mt-1">{ekycMessage}</p>
                               )}
                             </div>
                           </div>
                           {showEkycCta && (
                             <Button
                               type="button"
                               onClick={handleStartEkyc}
                               disabled={ekycLoading}
                               className="w-full h-10 text-sm font-semibold bg-zinc-950 hover:bg-black text-white"
                             >
                               {ekycLoading ? (
                                 <Loader2 className="w-4 h-4 animate-spin mr-2" />
                               ) : (
                                 <ExternalLink className="w-4 h-4 mr-2" />
                               )}
                               {ekycLoading
                                 ? 'Starting…'
                                 : ['initiated', 'pending'].includes(st)
                                   ? 'Continue DigiLocker'
                                   : 'Start eKYC'}
                             </Button>
                           )}
                         </div>
                       );
                     })()}

                     {/* Details Card */}
                     <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-gray-500" />
                           <h3 className="text-sm font-semibold text-gray-700">Application Details</h3>
                        </div>
                        <div className="p-5 space-y-4">
                           <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Purpose</span>
                              <span className="text-sm font-medium text-gray-900 capitalize">{loanApp.purpose?.replace(/_/g, ' ') || 'Refinance'}</span>
                           </div>
                           {['offer_sent', 'offer_accepted', 'esign_completed', 'disbursed', 'closed', 'defaulted'].includes(loanApp.application_status) && (
                               <>
                                   <Separator />
                                   <div className="flex justify-between">
                                      <span className="text-sm text-gray-500">Interest Rate</span>
                                      <span className="text-sm font-medium text-gray-900">{loanApp.interest_rate_per_day || loanApp.applied_interest_rate_daily || 0.1}% / day</span>
                                   </div>
                               </>
                           )}
                           
                           {isActiveLoan && (
                               <>
                                <Separator />
                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide block">Disbursed</span>
                                        <span className="text-sm text-purple-700">
                                          {loanApp.disbursed_at
                                            ? `Funds transferred on ${new Date(loanApp.disbursed_at).toLocaleDateString('en-IN')}.`
                                            : 'Funds have been transferred to your account.'}
                                        </span>
                                    </div>
                                </div>
                                {repaymentSummary?.nextDueDate && (
                                  <>
                                    <Separator />
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-500">Next due date</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {new Date(repaymentSummary.nextDueDate).toLocaleDateString('en-IN')}
                                      </span>
                                    </div>
                                  </>
                                )}
                                {bankDetails && (
                                  <>
                                    <Separator />
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-500">Disbursal account</span>
                                      <span className="text-sm font-medium text-gray-900 text-right">
                                        {bankDetails.bank_name}<br />
                                        <span className="text-xs text-gray-500">{bankDetails.account_number_masked}</span>
                                      </span>
                                    </div>
                                  </>
                                )}
                                {disbursements?.[0] && (
                                  <>
                                    <Separator />
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-500">Amount received</span>
                                      <span className="text-sm font-semibold text-emerald-700">
                                        ₹{parseFloat(disbursements[0].amount).toLocaleString()}
                                      </span>
                                    </div>
                                  </>
                                )}
                               </>
                           )}

                           {/* Video Declaration Status */}
                           {['video_declaration_pending', 'video_declaration_submitted', 'video_declaration_rejected'].includes(loanApp.application_status) && (
                               <>
                                 <Separator />
                                 <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                                    loanApp.application_status === 'video_declaration_submitted' ? 'bg-amber-50 border-amber-100' :
                                    loanApp.application_status === 'video_declaration_rejected' ? 'bg-red-50 border-red-100' :
                                    'bg-orange-50 border-orange-100'
                                 }`}>
                                    <Clock className={`w-5 h-5 ${
                                        loanApp.application_status === 'video_declaration_rejected' ? 'text-red-600' : 'text-orange-600'
                                    }`} />
                                    <div>
                                        <span className={`text-xs font-semibold uppercase tracking-wide block ${
                                            loanApp.application_status === 'video_declaration_rejected' ? 'text-red-800' : 'text-orange-800'
                                        }`}>
                                            {loanApp.application_status === 'video_declaration_pending' ? 'Video Declaration Needed' : 
                                             loanApp.application_status === 'video_declaration_submitted' ? 'Video Under Review' :
                                             'Video Rejected - Re-upload Required'}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                            {loanApp.application_status === 'video_declaration_pending' ? 'Please upload your video declaration from the dashboard.' : 
                                             loanApp.application_status === 'video_declaration_submitted' ? 'Our team is reviewing your video. You will be notified soon.' :
                                             'Your video was not accepted. Please re-upload from the dashboard.'}
                                        </span>
                                    </div>
                                 </div>
                               </>
                           )}

                           {loanApp.application_status === 'esign_completed' && (
                               <>
                                 <Separator />
                                 <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                    <div>
                                        <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wide block">E-Sign Complete</span>
                                        <span className="text-sm text-indigo-700">Loan agreement signed. Disbursement is being processed.</span>
                                    </div>
                                 </div>
                               </>
                           )}
                        </div>
                     </div>
                  </TabsContent>

                  {/* ──────────────── BREAKDOWN ──────────────── */}
                  <TabsContent value="breakdown" className="space-y-5 focus-visible:outline-none">
                     {(() => {
                        let fees = [];
                        let gst = 0;
                        let totalDeductions = 0;
                        let netDisbursement = 0;
                        let hasBreakdown = false;
                        const P = parseFloat(loanApp.approved_amount || loanApp.principal_amount || 0);
                        const sanitized = loanApp.feeBreakdown;

                        if (sanitized?.fee_details?.length) {
                          hasBreakdown = true;
                          fees = sanitized.fee_details.map((f) => ({
                            label: (f.fee_name || f.fee_code || 'Fee').replace(/_/g, ' '),
                            amount: Number(f.fee_amount || 0),
                          }));
                          gst = Number(sanitized.gstOnFees || 0);
                          totalDeductions = Number(sanitized.totalDeductions || loanApp.total_deductions || 0);
                          netDisbursement = Number(sanitized.netDisbursement || loanApp.disbursement_amount || 0);
                        }

                        try {
                           if (!hasBreakdown && loanApp.fee_breakdown) {
                              const parsed = typeof loanApp.fee_breakdown === 'string' 
                                 ? JSON.parse(loanApp.fee_breakdown) 
                                 : loanApp.fee_breakdown;
                              
                              if (parsed.processingFee !== undefined) {
                                 // Admin service format (camelCase keys with amounts)
                                 hasBreakdown = true;
                                 const pf =
                                    parseFloat(parsed.processingFee || 0) +
                                    parseFloat(parsed.platformFee || 0) +
                                    parseFloat(parsed.kycVerificationFee || 0) +
                                    parseFloat(parsed.onBoardingFee || 0);
                                 fees = [
                                    { label: 'Platform Fee / PF', amount: pf || parseFloat(parsed.processingFee || 0) },
                                 ];
                                 gst = parseFloat(parsed.gst || 0);
                                 totalDeductions = parseFloat(parsed.totalDeductible || 0);
                                 netDisbursement = parseFloat(parsed.netDisbursedAmount || 0);
                              } else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                                 // Offer service format (snake_case keys with percentage values)
                                 hasBreakdown = true;
                                 // Extract _calculated GST if present
                                 if (parsed._calculated) {
                                    gst = parseFloat(parsed._calculated.gst_on_fees || 0);
                                    totalDeductions = parseFloat(parsed._calculated.total_deductions || 0);
                                    netDisbursement = parseFloat(parsed._calculated.disbursement_amount || 0);
                                 }
                                 fees = Object.entries(parsed)
                                    .filter(([key]) => !key.startsWith('_'))
                                    .map(([key, val]) => {
                                       const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                       const value = parseFloat(val);
                                       const amount = value < 20 ? (P * value) / 100 : value;
                                       return { label, amount };
                                    });
                                 // If GST wasn't in _calculated, derive it from fee amounts
                                 if (gst === 0 && fees.length > 0) {
                                    const subTotal = fees.reduce((sum, f) => sum + f.amount, 0);
                                    gst = Math.round(subTotal * 0.18 * 100) / 100;
                                 }
                                 if (totalDeductions === 0 && fees.length > 0) {
                                    const subTotal = fees.reduce((sum, f) => sum + f.amount, 0);
                                    totalDeductions = parseFloat(loanApp.total_deductions) || (subTotal + gst);
                                 }
                                 if (netDisbursement === 0) {
                                    netDisbursement = parseFloat(loanApp.disbursement_amount) || (P - totalDeductions);
                                 }
                              }
                           }
                        } catch (e) {
                           console.error("Fee parse error", e);
                        }

                        // Fallback to calculated values if no stored breakdown
                        if (!hasBreakdown && P > 0) {
                           const pf = Math.round(P * 0.10);
                           fees = [
                              { label: 'Platform Fee (10%)', amount: pf },
                           ];
                           const subTotal = pf;
                           gst = Math.round(subTotal * 0.18);
                           totalDeductions = subTotal + gst;
                           netDisbursement = P - totalDeductions;
                        }

                        return (
                           <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                 <Banknote className="w-4 h-4 text-gray-500" />
                                 <h3 className="text-sm font-semibold text-gray-700">Fee Breakdown</h3>
                              </div>
                              <div className="divide-y divide-gray-100">
                                 {fees.map((fee, i) => (
                                    <div key={i} className="flex justify-between items-center py-3 px-5 hover:bg-gray-50/50 transition-colors">
                                       <span className="text-sm text-gray-600">{fee.label}</span>
                                       <span className="text-sm font-medium text-gray-900">₹{fee.amount.toLocaleString()}</span>
                                    </div>
                                 ))}
                                 <div className="flex justify-between items-center py-3 px-5 bg-gray-50/30">
                                    <span className="text-sm text-gray-600">GST (18%)</span>
                                    <span className="text-sm font-medium text-gray-900">₹{gst.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between items-center py-4 px-5 bg-gray-50 font-semibold border-t border-gray-100">
                                    <span className="text-gray-900">Total Deductions</span>
                                    <span className="text-red-600">- ₹{totalDeductions.toLocaleString()}</span>
                                 </div>
                              </div>
                              <div className="bg-emerald-50/50 p-5 mx-4 my-4 rounded-lg border border-emerald-100 flex items-center justify-between">
                                 <div>
                                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Net Disbursement</p>
                                    <p className="text-[10px] text-emerald-500">Amount transferred to your account</p>
                                 </div>
                                 <p className="text-2xl font-bold text-emerald-700">₹{netDisbursement.toLocaleString()}</p>
                              </div>
                           </div>
                        );
                     })()}
                  </TabsContent>

                  {/* ──────────────── DOCUMENTS ──────────────── */}
                  <TabsContent value="documents" className="space-y-5 focus-visible:outline-none">
                     <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 ml-1">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Documents</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-[10px] font-bold uppercase tracking-wide"
                            disabled={downloadingAll || !hasDownloadableDocs}
                            onClick={handleDownloadAll}
                          >
                            {downloadingAll ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {downloadingAll ? 'Preparing…' : 'Download All'}
                          </Button>
                        </div>
                        
                        {/* Residence Proofs */}
                        {residenceProofs?.map((doc, i) => {
                           const isImage = doc.file_format ? doc.file_format.startsWith('image/') : (doc.document_url && doc.document_url.includes('/image/upload/'));
                           return (
                           <div key={doc.id || i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-orange-50 text-orange-600 rounded-lg h-10 w-10 flex items-center justify-center shrink-0 overflow-hidden">
                                    {isImage && doc.document_url ? (
                                       <img src={doc.document_url} className="w-full h-full object-cover rounded" alt="Proof" />
                                    ) : (
                                       <FileText className="w-5 h-5" />
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium text-gray-900">Residence Proof {i+1}</p>
                                    <p className="text-xs text-gray-400">{doc.document_type || 'Proof'} {doc.file_format ? `• ${doc.file_format.split('/')[1]?.toUpperCase()}` : ''}</p>
                                 </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => {
                                 if (isImage && doc.document_url) {
                                    window.open(doc.document_url, '_blank');
                                 } else {
                                    const proxyUrl = documentsAPI.getDownloadUrl('residence_proof', loanApp?.application_number || 'doc', doc.document_url, doc.file_format);
                                    window.open(proxyUrl, '_blank');
                                 }
                              }}>
                                 <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                              </Button>
                           </div>
                           );
                        })}

                        {/* Bank Statements */}
                        {bankStatements?.map((doc, i) => (
                           <div key={doc.id || i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                    <Banknote className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium text-gray-900">Bank Statement</p>
                                    <p className="text-xs text-gray-400">Uploaded: {new Date(doc.created_at).toLocaleDateString()} • PDF</p>
                                 </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => {
                                 const proxyUrl = documentsAPI.getDownloadUrl('bank_statement', loanApp?.application_number || 'doc', doc.statement_url, doc.file_format || 'application/pdf');
                                 window.open(proxyUrl, '_blank');
                              }}>
                                 <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                              </Button>
                           </div>
                        ))}

                        {/* Salary Slips */}
                        {salarySlips?.map((doc, i) => (
                           <div key={doc.id || i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileText className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium text-gray-900">Salary Slip {doc.month_tag ? `(${doc.month_tag.replace('_', ' ')})` : ''}</p>
                                    <p className="text-xs text-gray-400">Uploaded: {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()} • {doc.file_format?.split('/')[1]?.toUpperCase() || 'PDF'}</p>
                                 </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => {
                                 const proxyUrl = documentsAPI.getDownloadUrl('salary_slip', loanApp?.application_number || 'doc', doc.file_url, doc.file_format || 'application/pdf');
                                 window.open(proxyUrl, '_blank');
                              }}>
                                 <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                              </Button>
                           </div>
                        ))}
                        
                        {/* E-Sign Documents */}
                        {esignDocuments?.map((doc, i) => (
                           <div key={doc.id || i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileText className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium text-gray-900">{doc.document_type === 'loan_agreement' ? 'Loan Agreement' : 'Sanction Letter'}</p>
                                    <p className="text-xs text-gray-400">Signed: {new Date(doc.signed_at).toLocaleDateString()} • PDF</p>
                                 </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => {
                                 const docType = doc.document_type === 'loan_agreement' ? 'loan_agreement' : 'sanction_letter';
                                 const targetUrl = doc.signed_document_url || doc.document_url;
                                 const proxyUrl = documentsAPI.getDownloadUrl(docType, loanApp?.application_number || 'doc', targetUrl, 'application/pdf');
                                 window.open(proxyUrl, '_blank');
                              }}>
                                 <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                              </Button>
                           </div>
                        ))}

                        {(!residenceProofs?.length && !bankStatements?.length && !salarySlips?.length && !esignDocuments?.length) && (
                           <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                              <p className="text-sm text-gray-500">No documents found</p>
                           </div>
                        )}
                     </div>
                  </TabsContent>

                  {/* ──────────────── REPAYMENTS (NEW) ──────────────── */}
                   {showRepayments && (
                      <TabsContent value="repayments" className="space-y-5 focus-visible:outline-none">
                           {repaymentsLoading ? (
                               <div className="flex justify-center py-10">
                                   <Spinner className="w-6 h-6 text-zinc-500" />
                               </div>
                           ) : repayments.length === 0 ? (
                               <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                  <p className="text-sm text-gray-500">No repayment history found</p>
                               </div>
                           ) : (
                               <div className="space-y-3">
                                   {repayments.map((emi) => (
                                       <div key={emi.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                                           <div>
                                               <div className="flex items-center gap-2 mb-1">
                                                   <span className="text-xs font-bold text-gray-900">
                                                       {repayments.length === 1 ? 'Full Payment' : `EMI #${emi.emiNumber}`}
                                                   </span>
                                                   <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                                       emi.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                       emi.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                       'bg-amber-100 text-amber-700'
                                                   }`}>
                                                       {emi.status}
                                                   </span>
                                               </div>
                                               <div className="flex items-center gap-4 text-xs text-gray-500">
                                                   <span>Amount: <span className="font-semibold text-gray-900">₹{parseFloat(emi.amount).toLocaleString()}</span></span>
                                                   <span>|</span>
                                                   <span>Due: {new Date(emi.dueDate || emi.due_date).toLocaleDateString()}</span>
                                               </div>
                                           </div>
                                            {emi.status === 'paid' && (
                                                <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                </div>
                                            )}
                                       </div>
                                   ))}
                               </div>
                           )}
                      </TabsContent>
                   )}
                </Tabs>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
