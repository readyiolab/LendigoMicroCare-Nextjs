import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Wallet,
  CheckCircle2,
  Sparkles,
  HandCoins,
  TrendingDown,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from '@/lib/router';
import RepaymentCard from '@/components/repayment/RepaymentCard';
import PaymentModal from '@/components/repayment/PaymentModal';
import { loanAPI } from '@/lib/api/loan';
import { paymentAPI } from '@/lib/api/payment';
import { uploadToCloudinary, UPLOAD_FOLDERS } from '@/lib/services/cloudinaryUpload';
import MainLayout from '@/components/layouts/MainLayout';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function StatTile({ label, value, variant = 'default' }) {
  const variants = {
    default: 'text-slate-900',
    success: 'text-emerald-600',
    info: 'text-blue-600',
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2.5">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={cn('text-sm font-semibold mt-0.5 tabular-nums', variants[variant])}>{value}</p>
    </div>
  );
}

export default function LoanRepayment() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loanDetails, setLoanDetails] = useState(null);
  const [emis, setEmis] = useState([]);
  const [selectedEmi, setSelectedEmi] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [easebuzzLoading, setEasebuzzLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [prepaymentInfo, setPrepaymentInfo] = useState(null);
  const [companyPaymentInfo, setCompanyPaymentInfo] = useState(null);

  const fetchCompanyPaymentInfo = async () => {
    if (companyPaymentInfo) return companyPaymentInfo;
    try {
      const paymentRes = await loanAPI.getCompanyPaymentInfo();
      if (paymentRes?.status === 1 && paymentRes?.data) {
        setCompanyPaymentInfo(paymentRes.data);
        return paymentRes.data;
      }
    } catch (e) {
      // Non-blocking: repayment API already sends a UPI string per EMI.
    }
    return null;
  };

  const fetchRepaymentData = async () => {
    try {
      setLoading(true);

      const activeRes = await loanAPI.getActiveRepaymentLoan();
      const active = activeRes?.status === 1 ? activeRes.data : null;

      if (!active?.loanId) {
        setLoanDetails(null);
        setEmis([]);
        setPrepaymentInfo(null);
        return;
      }

      // Prefer embedded details from /repayment/active (single RTT). Fall back to /:id if needed.
      let details = active.details || null;
      if (!details?.emis) {
        const response = await loanAPI.getRepaymentDetails(active.loanId);
        if (response.status === 1) details = response.data;
      }

      if (details) {
        setLoanDetails({
          loanId: details.loanId || active.loanId,
          totalAmount: details.totalAmount,
          paidAmount: details.paidAmount,
          underReviewAmount: details.underReviewAmount,
          pendingAmount: details.pendingAmount,
          loanStatus: details.loanStatus || 'Active',
          applicationNumber: details.applicationNumber || active.applicationNumber || null,
          leadId: details.leadId || active.leadId || null,
          loanAccountNumber: details.loanAccountNumber || active.loanAccountNumber || null,
          activeSettlement: active.activeSettlement || null,
          isBullet: details.isBullet,
        });
        setEmis(details.emis || []);
        setPrepaymentInfo(details.prepayment || null);
      } else {
        setLoanDetails(null);
        setEmis([]);
        setPrepaymentInfo(null);
      }
    } catch (error) {
      console.error('Error fetching repayment data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepaymentData();
  }, []);

  // Handle SURL/FURL return banners
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;
    if (payment === 'success') {
      setSuccessMsg('Payment successful. Your schedule will refresh shortly.');
      setErrorMsg('');
      setTimeout(() => fetchRepaymentData(), 1200);
    } else if (payment === 'failed') {
      const reason = searchParams.get('reason');
      setErrorMsg(
        reason === 'hash'
          ? 'Payment verification failed. If money was deducted, contact support with your UTR.'
          : 'Payment failed or was cancelled. You can try again.'
      );
      setSuccessMsg('');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('payment');
    next.delete('txnid');
    next.delete('reason');
    setSearchParams(next, { replace: true });
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 8000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePayClick = (emi) => {
    fetchCompanyPaymentInfo().finally(() => {
      setSelectedEmi(emi);
      setIsModalOpen(true);
    });
  };

  const handleEasebuzzPay = async ({ mode, repaymentId, amount }) => {
    if (!loanDetails?.loanId) {
      throw new Error('Loan not found');
    }
    setEasebuzzLoading(true);
    try {
      const body = { mode };
      if (mode === 'full' && repaymentId) body.repaymentId = repaymentId;
      if (mode === 'part') body.amount = amount;
      const res = await paymentAPI.initiateRepayment(loanDetails.loanId, body);
      if (res?.status === 1 && res?.data?.paymentUrl) {
        return res.data;
      }
      throw new Error(res?.message || 'Failed to create payment link');
    } finally {
      setEasebuzzLoading(false);
    }
  };

  const handlePaymentSubmit = async (paymentData) => {
    setSubmitting(true);
    try {
      if (!loanDetails?.loanId) return;

      let screenshotUrl = null;
      if (paymentData.screenshot) {
        const uploadResult = await uploadToCloudinary(paymentData.screenshot, {
          folder: UPLOAD_FOLDERS.repayment,
          resourceType: 'image',
        });
        screenshotUrl = uploadResult.url;
      }

      const response = await loanAPI.submitRepayment({
        loanId: loanDetails.loanId,
        amount: selectedEmi.amount,
        emiId: paymentData.emiId,
        utr: paymentData.utr,
        screenshotUrl,
      });

      if (response.status === 1) {
        const isPrepayment = selectedEmi?.emiNumber === 'PREPAY';
        const paymentLabel = isPrepayment ? 'Early closure' : 'Payment';
        setSuccessMsg(`${paymentLabel} submitted successfully. We will verify within 30 minutes.`);

        setEmis((prev) =>
          prev.map((e) =>
            e.id === (isPrepayment ? prev[0]?.id : selectedEmi.id)
              ? { ...e, status: 'under_review', amount: selectedEmi.amount }
              : e
          )
        );

        if (isPrepayment && prepaymentInfo) {
          setLoanDetails((prev) => ({
            ...prev,
            underReviewAmount: prepaymentInfo.totalPrepaymentAmount,
            pendingAmount: 0,
          }));
        }

        setIsModalOpen(false);
        setSelectedEmi(null);
        setTimeout(() => setSuccessMsg(''), 5000);
        setTimeout(() => fetchRepaymentData(), 1500);
      }
    } catch (error) {
      console.error('Payment submission failed', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrepayClick = () => {
    if (!prepaymentInfo || !loanDetails) return;
    fetchCompanyPaymentInfo().finally(() => {
      setSelectedEmi({
        id: emis[0]?.id,
        emiNumber: 'PREPAY',
        amount: prepaymentInfo.totalPrepaymentAmount,
        title: 'Early closure',
        status: 'pending',
        dueDate: new Date().toISOString(),
        upiString: prepaymentInfo.upiString,
        upiReference: prepaymentInfo.upiReference,
      });
      setIsModalOpen(true);
    });
  };

  const canPrepay =
    prepaymentInfo &&
    prepaymentInfo.totalPrepaymentAmount > 0 &&
    !emis.some((e) => e.status === 'under_review') &&
    !emis.some((e) => e.status === 'overdue') &&
    loanDetails?.loanStatus !== 'Overdue';

  const pendingEmi = emis.find((e) => e.status === 'pending' || e.status === 'overdue');

  const prepaySaves =
    canPrepay &&
    prepaymentInfo?.interestSaved > 0 &&
    prepaymentInfo.totalPrepaymentAmount < (pendingEmi?.amount || Infinity);

  const prepayHint =
    prepaySaves && prepaymentInfo
      ? `Early closure available at ₹${prepaymentInfo.totalPrepaymentAmount.toLocaleString('en-IN')} — save ₹${prepaymentInfo.interestSaved.toLocaleString('en-IN')} in interest.`
      : null;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Spinner className="w-8 h-8 text-[#1D2B44]" />
        </div>
      </MainLayout>
    );
  }

  if (!loanDetails) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
          <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
            <Wallet className="w-7 h-7 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">No active loan</h2>
          <p className="text-sm text-slate-500 mt-1">There are no repayments due at this time.</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-6 bg-[#1D2B44] hover:bg-[#152238]">
            Back to Dashboard
          </Button>
        </div>
      </MainLayout>
    );
  }

  const statusColor =
    loanDetails.loanStatus === 'Overdue'
      ? 'bg-red-500'
      : loanDetails.loanStatus === 'Paid'
        ? 'bg-emerald-500'
        : 'bg-emerald-400';

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto pb-10 px-1">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Dashboard
        </button>

        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Repayments</h1>
            {(loanDetails.loanAccountNumber || loanDetails.leadId) && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {loanDetails.loanAccountNumber
                  ? `LAN ${loanDetails.loanAccountNumber}`
                  : `Lead ${loanDetails.leadId}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn('w-1.5 h-1.5 rounded-full', statusColor)} />
            <span className="text-[11px] font-medium text-slate-500">{loanDetails.loanStatus}</span>
          </div>
        </div>

        {successMsg && (
          <Alert className="mb-3 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-sm text-emerald-800">{successMsg}</AlertDescription>
          </Alert>
        )}

        {errorMsg && (
          <Alert className="mb-3 border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-sm text-red-800">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {loanDetails.activeSettlement?.status === 'approved' && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-amber-900">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-semibold">Settlement offer</span>
              </div>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                Pay ₹{loanDetails.activeSettlement.settlement_amount?.toLocaleString('en-IN')} before{' '}
                {format(new Date(loanDetails.activeSettlement.valid_until), 'dd MMM yyyy')}
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shrink-0"
              onClick={() => {
                setSelectedEmi({
                  id: 'SETTLEMENT',
                  emiNumber: 'SETTLEMENT',
                  amount: loanDetails.activeSettlement.settlement_amount,
                  title: 'Settlement',
                  status: 'pending',
                });
                setIsModalOpen(true);
              }}
            >
              <HandCoins className="w-3.5 h-3.5 mr-1.5" />
              Pay settlement
            </Button>
          </div>
        )}

        <div
          className={cn(
            'grid gap-3 mb-4',
            loanDetails.underReviewAmount > 0
              ? 'grid-cols-2 sm:grid-cols-3'
              : 'grid-cols-2'
          )}
        >
          <StatTile
            label="Outstanding"
            value={`₹${loanDetails.pendingAmount?.toLocaleString('en-IN')}`}
          />
          <StatTile
            label="Paid"
            value={`₹${loanDetails.paidAmount?.toLocaleString('en-IN')}`}
            variant="success"
          />
          {loanDetails.underReviewAmount > 0 && (
            <StatTile
              label="Verifying"
              value={`₹${loanDetails.underReviewAmount?.toLocaleString('en-IN')}`}
              variant="info"
            />
          )}
        </div>

        <div
          className={cn(
            'grid gap-3 items-stretch',
            canPrepay ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {canPrepay ? (
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm p-3 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Early closure
                </h2>
                {prepaymentInfo.interestSaved > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    <TrendingDown className="w-3 h-3" />
                    Save ₹{prepaymentInfo.interestSaved.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <p className="text-lg font-semibold text-slate-900 tabular-nums">
                ₹{prepaymentInfo.totalPrepaymentAmount?.toLocaleString('en-IN')}
              </p>
              <dl className="mt-2 space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between gap-2">
                  <dt>Principal</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">
                    ₹{prepaymentInfo.outstandingPrincipal?.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Interest ({prepaymentInfo.daysUsed}d)</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">
                    ₹{prepaymentInfo.proRataInterest?.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Fee</dt>
                  <dd className="font-medium text-emerald-600">Nil</dd>
                </div>
              </dl>
              {pendingEmi && prepaySaves && (
                <p className="text-[11px] text-slate-500 mt-2 leading-snug border-t border-slate-100 pt-2">
                  Due-date ₹{parseFloat(pendingEmi.amount).toLocaleString('en-IN')} → interest for{' '}
                  {prepaymentInfo.daysUsed} day{prepaymentInfo.daysUsed === 1 ? '' : 's'} only.
                </p>
              )}
              <div className="mt-auto pt-3 flex justify-end">
                <Button
                  size="sm"
                  onClick={handlePrepayClick}
                  className="h-8 px-3 bg-[#1D2B44] hover:bg-[#152238] text-xs font-semibold rounded-lg"
                >
                  Pay early closure
                </Button>
              </div>
            </section>
          ) : null}

          <section className="min-w-0">
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {emis.length === 1 ? 'Scheduled payment' : 'Payment schedule'}
            </h2>
            {emis.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                No payments scheduled yet.
              </p>
            ) : (
              <div
                className={cn(
                  'grid gap-3',
                  emis.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                )}
              >
                {emis.map((emi) => (
                  <RepaymentCard
                    key={emi.id}
                    emi={{
                      ...emi,
                      title:
                        emis.length === 1
                          ? 'Full repayment (on due date)'
                          : `Instalment ${emi.emiNumber}`,
                    }}
                    onPay={handlePayClick}
                    disabled={submitting || easebuzzLoading}
                    prepayHint={emi.id === pendingEmi?.id ? prepayHint : null}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {emis.some((e) => e.status === 'under_review') && !canPrepay && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Payment under verification — typically 15–30 minutes.
          </div>
        )}
      </div>

      {isModalOpen && selectedEmi && (
        <PaymentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEmi(null);
          }}
          emi={selectedEmi}
          companyInfo={companyPaymentInfo}
          onSubmit={handlePaymentSubmit}
          loading={submitting}
          applicationId={loanDetails.loanId}
          outstandingAmount={loanDetails.pendingAmount}
          onEasebuzzPay={undefined}
          easebuzzLoading={false}
        />
      )}
    </MainLayout>
  );
}
