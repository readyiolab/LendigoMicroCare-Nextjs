import { useState, useEffect } from 'react';
import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IndianRupee, Clock, ArrowRight, CheckCircle2, AlertCircle, Sparkles, CalendarDays } from 'lucide-react';
import { loanAPI, adminAPI } from '@/lib/api';
import { handleFormError } from '@/lib/utils/formErrors';
import {
    getNextSalaryRepaymentDate,
    getRepaymentDateOptions,
    resolveMaxTenureDays,
} from '@/lib/utils/salaryRepaymentDates';
import StepLayout from './StepLayout';

const LOAN_PURPOSES = [
  { value: "personal", label: "Personal Expenses" },
  { value: "medical", label: "Medical Emergency" },
  { value: "education", label: "Education" },
  { value: "wedding", label: "Wedding" },
  { value: "home_renovation", label: "Home Renovation" },
  { value: "debt_consolidation", label: "Debt Consolidation" },
  { value: "business", label: "Business Needs" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

export default function LoanRequestForm({ applicationId, targetUserId, onSuccess, onClose, isAdminMode = false }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loanDetails, setLoanDetails] = useState({
        purpose: "personal",
        principalAmount: "",
        tenureDays: "14",
        selectedRepaymentDate: ""
    });
    const [repaymentDateOptions, setRepaymentDateOptions] = useState([]);

    useEffect(() => {
        if (targetUserId) {
            fetchInitialData();
        }
    }, [targetUserId]);

    const fetchInitialData = async () => {
        try {
            const response = await loanAPI.getDashboardStatus({ targetUserId });
            if (response.status === 1) {
                const data = response.data;
                
                if (data.existingApplication) {
                    const app = data.existingApplication;
                    setLoanDetails(prev => ({
                        ...prev,
                        purpose: app.purpose || "personal",
                        principalAmount: app.principal_amount || "",
                        tenureDays: (app.tenure_days && app.tenure_days > 0) ? app.tenure_days.toString() : "14",
                        selectedRepaymentDate: (app.repayment_due_date || app.due_date || app.repayment_date) ? 
                            new Date(app.repayment_due_date || app.due_date || app.repayment_date).toISOString().split('T')[0] : ""
                    }));
                }

                const nextSalaryDate = data.profile?.nextSalaryDate || data.profile?.next_salary_date;
                const maxTenureDays = resolveMaxTenureDays(data.profile?.max_tenure_days);
                const nextSalary = getNextSalaryRepaymentDate(nextSalaryDate, { maxTenureDays });
                if (nextSalary) {
                    const options = getRepaymentDateOptions(nextSalary, { maxTenureDays });
                    setRepaymentDateOptions(options);

                    if (!loanDetails.selectedRepaymentDate || !data.existingApplication?.tenure_days) {
                        handleRepaymentDateSelect(options[0]);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch initial data:', err);
        }
    };

    const handleRepaymentDateSelect = (dateObj) => {
        const today = startOfDay(new Date());
        const diffDays = differenceInCalendarDays(dateObj, today);
        setLoanDetails(prev => ({
            ...prev,
            tenureDays: diffDays > 0 ? diffDays.toString() : "7",
            selectedRepaymentDate: format(dateObj, 'yyyy-MM-dd')
        }));
    };

    const handleSubmit = async () => {
        setFieldErrors({});
        setError('');

        if (!loanDetails.purpose || !loanDetails.principalAmount || !loanDetails.tenureDays) {
            const newErrors = {};
            if (!loanDetails.purpose) newErrors.purpose = "Please select a loan purpose";
            if (!loanDetails.principalAmount) newErrors.principalAmount = "Please enter desired amount";
            if (!loanDetails.tenureDays) newErrors.tenureDays = "Please select tenure";
            setFieldErrors(newErrors);
            setError("Please fill all loan details");
            return;
        }

        const amount = parseFloat(loanDetails.principalAmount);
        if (amount < 1000 || amount > 50000) {
            setFieldErrors({ principalAmount: "Loan amount must be between ₹1,000 and ₹50,000" });
            setError("Loan amount must be between ₹1,000 and ₹50,000");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                applicationId: applicationId,
                purpose: loanDetails.purpose,
                principalAmount: parseFloat(loanDetails.principalAmount),
                tenureDays: parseInt(loanDetails.tenureDays),
                selectedRepaymentDate: loanDetails.selectedRepaymentDate,
                targetUserId: targetUserId
            };

            const response = isAdminMode
                ? await adminAPI.submitAssistedApplication({ 
                    ...payload, 
                    loanAmount: payload.principalAmount,
                    userId: targetUserId,
                    isFinal: false 
                  })
                : await loanAPI.createLoanApplication(payload);

            if (response.status === 1) {
                onSuccess && onSuccess();
            } else {
                setError(response.message || 'Failed to submit application');
            }
        } catch (err) {
            console.error('Submit error:', err);
            handleFormError(err, setFieldErrors, setError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <StepLayout
            title="Loan Request"
            description="Configure your loan amount and repayment terms."
            onClose={onClose}
            icon={IndianRupee}
            footer={
                <Button 
                    onClick={handleSubmit} 
                    disabled={loading || !loanDetails.principalAmount}
                    loading={loading}
                    className="w-full h-12 text-sm font-black bg-zinc-950 hover:bg-black text-white shadow-xl shadow-zinc-100 rounded-lg transition-all active:scale-[0.98] uppercase tracking-wide"
                >
                    {isAdminMode ? 'Save & Continue' : 'Submit Application'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            }
        >
            <div className="space-y-10">
                {error && (
                    <Alert variant="destructive" className="py-3 rounded-lg border-red-100 bg-red-50/30">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-xs font-bold text-red-800 ml-2">{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Loan Purpose</Label>
                        <select
                            value={loanDetails.purpose}
                            onChange={(e) => {
                                const val = e.target.value;
                                setLoanDetails(prev => ({ ...prev, purpose: val }));
                                if (fieldErrors.purpose) setFieldErrors(prev => ({ ...prev, purpose: '' }));
                            }}
                            className={`h-12 w-full rounded-lg border border-zinc-200 focus:ring-zinc-900 text-sm bg-white font-black px-3 ${fieldErrors.purpose ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        >
                            <option value="" disabled>Select purpose</option>
                            {LOAN_PURPOSES.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        {fieldErrors.purpose && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.purpose}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Desired Amount (₹)</Label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center border border-zinc-100 font-black text-slate-500 group-focus-within:bg-white group-focus-within:text-white group-focus-within:border-zinc-900 transition-all">
                                ₹
                            </div>
                            <Input 
                                type="number"
                                placeholder="1,000 - 50,000"
                                value={loanDetails.principalAmount}
                                onChange={(e) => {
                                    setLoanDetails(prev => ({ ...prev, principalAmount: e.target.value }));
                                    if (fieldErrors.principalAmount) setFieldErrors(prev => ({ ...prev, principalAmount: '' }));
                                }}
                                className={`pl-14 h-12 rounded-lg border-zinc-200 focus:ring-zinc-900 text-sm font-black tracking-tight ${fieldErrors.principalAmount ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                min="1000"
                                max="50000"
                            />
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest ml-1">Limit: ₹1,000 - ₹50,000</p>
                        {fieldErrors.principalAmount && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {fieldErrors.principalAmount}</p>}
                    </div>
                </div>

                {repaymentDateOptions.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Repayment Date</Label>
                            <div className="bg-zinc-50 text-slate-500 border border-zinc-100 font-black text-[9px] uppercase px-2 py-0.5 rounded-full">Synced with Salary</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {repaymentDateOptions.map((dateObj, idx) => {
                                const dateStr = format(dateObj, 'yyyy-MM-dd');
                                const isSelected = loanDetails.selectedRepaymentDate === dateStr;
                                const dayLabel = idx === 0 ? 'Salary Day' : `+${idx} Day${idx > 1 ? 's' : ''}`;
                                
                                return (
                                    <button
                                        key={dateStr}
                                        type="button"
                                        onClick={() => handleRepaymentDateSelect(dateObj)}
                                        className={`relative group flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-all duration-300 text-center
                                            ${isSelected 
                                                ? 'border-zinc-900 bg-zinc-950 text-white shadow-2xl shadow-zinc-200 scale-[1.02] z-10' 
                                                : 'border-zinc-100 bg-zinc-50/50 text-slate-500 hover:border-zinc-300 hover:bg-zinc-50'
                                            }`}
                                    >
                                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isSelected ? 'text-slate-500' : 'text-slate-500'}`}>
                                            {dayLabel}
                                        </span>
                                        <span className={`text-2xl font-black leading-none my-1 tracking-tighter ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                                            {dateObj.getDate()}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-slate-500' : 'text-slate-500'}`}>
                                            {dateObj.toLocaleDateString('en-IN', { month: 'short' })}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in-50 duration-300">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="p-6 bg-zinc-950 text-white rounded-lg flex items-center justify-between shadow-2xl shadow-zinc-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                            <Clock className="w-6 h-6 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Repayment Tenure</p>
                            <p className="text-xl font-black tracking-tight">{loanDetails.tenureDays} Days</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/5">
                            <Sparkles className="w-3 h-3 text-yellow-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Smart Tenure</span>
                        </div>
                    </div>
                </div>
            </div>
        </StepLayout>
    );
}
