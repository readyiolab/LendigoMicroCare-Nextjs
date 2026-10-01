import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2, Printer } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '@/lib/api/config';

const LOGO_URL = "https://res.cloudinary.com/dbyjiqjui/image/upload/v1770539125/logo_meijmf.webp";
const BRAND_NAME = "Lendigo Microcare";
const NBFC_NAME = "Aarsh Fincon Limited";
const UMBRELLA_LINE = "Under the umbrella of Aarsh Fincon Limited";
const WEBSITE_URL = "www.lendigomicrocare.com";
const CIN_NO = "U85300UP2020NPL139208"; 
const ADDRESS = "S. No. 5, Baldevi Tawar, Suhag Nagar, Firozabad, Uttar Pradesh - 283203";
const DELHI_ADDRESS = "Office No. 221A, Jaina Tower-1, Second Floor, Janakpuri District Centre, New Delhi - 110058";
const GRIEVANCE_OFFICER = {
    name: "Mr. Deepak Kumar",
    phone: "9116013916",
    email: "deepak.kumar@aarshfincon.com",
};

export default function SanctionLetter({ application, userProfile }) {
    const letterRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!application) return null;

    const sanctionRawDate = new Date(application.approved_at || application.approvedAt || application.offer_sent_at || application.offerSentAt || Date.now());
    const sanctionDate = sanctionRawDate.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const loanAmount = Number(application.approved_amount || application.approvedAmount || application.principal_amount || application.principalAmount || 0);
    const tenureDays = Number(application.tenure_days || application.tenureDays || 14);
    const dailyInterestRate = Number(application.applied_interest_rate_daily || application.interestRateDaily || application.interest_rate_per_day || application.interestRatePerDay || 0.1);
    const annualizedRate = (dailyInterestRate * 365).toFixed(2);

    // Fee Parsing with fallback to empty array/object
    let feeBreakdown = [];
    try {
        const rawFees = application.fee_breakdown || application.feeBreakdown;
        let parsed = null;
        if (Array.isArray(rawFees)) {
            feeBreakdown = rawFees;
        } else if (typeof rawFees === 'string') {
            parsed = JSON.parse(rawFees || '[]');
        } else if (typeof rawFees === 'object' && rawFees !== null) {
            parsed = rawFees;
        }

        if (parsed) {
            if (Array.isArray(parsed)) {
                feeBreakdown = parsed;
            } else if (parsed._calculated?.fee_breakdown?.length) {
                feeBreakdown = parsed._calculated.fee_breakdown;
            } else if (parsed._calculated?.fee_details?.length) {
                feeBreakdown = parsed._calculated.fee_details;
            } else if (parsed.fee_breakdown?.length) {
                feeBreakdown = parsed.fee_breakdown;
            } else if (parsed.fee_details?.length) {
                feeBreakdown = parsed.fee_details;
            } else if (typeof parsed === 'object') {
                const entries = Object.entries(parsed).filter(([code]) => !code.startsWith('_'));
                const standardMapped = [];
                let hasStandardKeys = false;
                for (const [code] of entries) {
                    if (['process_fee', 'processing_fee', 'platform_fee', 'verification_charges', 'kyc_fee', 'kyc_verification_fee', 'convenience_charges', 'onboarding_fee', 'on_boarding_fee'].includes(code)) {
                        hasStandardKeys = true;
                    }
                }
                
                if (hasStandardKeys) {
                    feeBreakdown = entries.map(([code, percent]) => ({
                        fee_code: code,
                        fee_percent: percent,
                        fee_amount: Number(((loanAmount * percent) / 100).toFixed(2))
                    }));
                } else {
                    if (parsed.processingFee !== undefined || parsed.kycVerificationFee !== undefined || parsed.onBoardingFee !== undefined || parsed.platformFee !== undefined) {
                        if (parsed.processingFee !== undefined) {
                            standardMapped.push({ fee_code: 'process_fee', fee_percent: 0, fee_amount: Number(parsed.processingFee) });
                        }
                        if (parsed.platformFee !== undefined) {
                            standardMapped.push({ fee_code: 'platform_fee', fee_percent: 0, fee_amount: Number(parsed.platformFee) });
                        }
                        if (parsed.kycVerificationFee !== undefined) {
                            standardMapped.push({ fee_code: 'verification_charges', fee_percent: 0, fee_amount: Number(parsed.kycVerificationFee) });
                        }
                        if (parsed.onBoardingFee !== undefined) {
                            standardMapped.push({ fee_code: 'convenience_charges', fee_percent: 0, fee_amount: Number(parsed.onBoardingFee) });
                        }
                        feeBreakdown = standardMapped;
                    } else {
                        feeBreakdown = entries.map(([code, percent]) => ({
                            fee_code: code,
                            fee_percent: typeof percent === 'number' ? percent : 0,
                            fee_amount: typeof percent === 'number' ? Number(((loanAmount * percent) / 100).toFixed(2)) : 0
                        }));
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error parsing fee breakdown", e);
    }

    const FEE_CODE_ALIASES = {
        process_fee: ['process_fee', 'processing_fee'],
        platform_fee: ['platform_fee'],
        verification_charges: ['verification_charges', 'kyc_fee', 'kyc_verification_fee'],
        convenience_charges: ['convenience_charges', 'onboarding_fee', 'on_boarding_fee'],
    };

    const getFeeDetails = (code, altCode) => {
        const codes = [...new Set([code, altCode, ...(FEE_CODE_ALIASES[code] || [])].filter(Boolean))];
        const fee = feeBreakdown.find((f) => codes.includes(f.fee_code));
        if (fee) {
            let percent = Number(fee.fee_percent || 0);
            const amount = Number(
                fee.fee_amount || (percent && loanAmount ? Math.round((loanAmount * percent) / 100) : 0)
            );
            if (!percent && amount && loanAmount) {
                percent = Math.round((amount / loanAmount) * 1000) / 10;
            }
            return { percent, amount };
        }

        // Direct property fallback from application or fee breakdown object
        let directAmount = 0;
        let parsed = null;
        try {
            const rawFees = application.fee_breakdown || application.feeBreakdown;
            if (typeof rawFees === 'string') {
                parsed = JSON.parse(rawFees);
            } else if (typeof rawFees === 'object') {
                parsed = rawFees;
            }
        } catch (e) {}

        const getVal = (...fields) => {
            for (const field of fields) {
                if (application[field] != null && application[field] !== '') return application[field];
                if (parsed?.[field] != null && parsed[field] !== '') return parsed[field];
            }
            return 0;
        };

        if (codes.some((c) => ['process_fee', 'processing_fee'].includes(c))) {
            directAmount = getVal('processingFee', 'processing_fee', 'process_fee', 'processingFeeAmt');
        } else if (codes.includes('platform_fee')) {
            directAmount = getVal('platformFee', 'platform_fee', 'platformFeeAmt');
        } else if (codes.some((c) => ['verification_charges', 'kyc_fee', 'kyc_verification_fee'].includes(c))) {
            directAmount = getVal(
                'kycVerificationFee',
                'kyc_verification_fee',
                'verificationCharges',
                'verification_charges',
                'kyc_fee'
            );
        } else if (codes.some((c) => ['convenience_charges', 'onboarding_fee', 'on_boarding_fee'].includes(c))) {
            directAmount = getVal(
                'convenienceCharges',
                'onBoardingFee',
                'onboarding_fee',
                'on_boarding_fee',
                'convenience_charges',
                'onBoardingFeeAmt'
            );
        }

        if (directAmount) {
            const amount = Number(directAmount);
            const percent = loanAmount > 0 ? Math.round((amount / loanAmount) * 1000) / 10 : 0;
            return { percent, amount };
        }

        return { percent: 0, amount: 0 };
    };

    const processingFee = getFeeDetails('process_fee', 'processing_fee');
    const platformFee = getFeeDetails('platform_fee');
    const verificationCharges = getFeeDetails('verification_charges', 'kyc_fee');
    const convenienceCharges = getFeeDetails('convenience_charges', 'onboarding_fee');

    let calc = null;
    try {
        const raw = application.fee_breakdown || application.feeBreakdown;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed?._calculated && typeof parsed._calculated === 'object') calc = parsed._calculated;
    } catch (_) { /* ignore */ }

    const totalFeesAmount = calc?.total_fees != null
        ? Number(calc.total_fees)
        : (processingFee.amount + platformFee.amount + verificationCharges.amount + convenienceCharges.amount);
    const platformFeePercent = loanAmount > 0
        ? (processingFee.percent > 0 && !(platformFee.amount || verificationCharges.amount || convenienceCharges.amount)
            ? processingFee.percent
            : Math.round((totalFeesAmount / loanAmount) * 1000) / 10)
        : processingFee.percent || 10;
    const platformFeeAmount = totalFeesAmount;
    const gstOnFees = calc?.gst_on_fees != null
        ? Number(calc.gst_on_fees)
        : Math.round(totalFeesAmount * 0.18);
    const totalInterest = calc?.interest_amount != null
        ? Number(calc.interest_amount)
        : Math.round((loanAmount * dailyInterestRate * tenureDays) / 100);
    const totalDeductible = Number(
        calc?.total_deductions ?? application.total_deductions ?? application.totalDeductions ?? (totalFeesAmount + gstOnFees)
    );
    const netDisbursement = Number(
        calc?.disbursement_amount ?? application.disbursement_amount ?? application.disbursementAmount ?? (loanAmount - totalDeductible)
    );
    const totalRepayment = Number(
        calc?.total_repayment ?? application.total_repayment_amount ?? application.totalRepayment ?? (loanAmount + totalInterest)
    );

    const productName = application.product_name || application.productName || calc?.product_name || null;
    const loanAccountNumber =
        application.loan_account_number ||
        application.loanAccountNumber ||
        null;
    const leadId = application.lead_id || application.leadId || null;
    const primaryReference = loanAccountNumber || leadId || (application.id ? String(application.id) : null);

    const repaymentDateStr = application.due_date || application.dueDate || application.repayment_date || application.repaymentDate;
    const repaymentDate = repaymentDateStr
        ? new Date(repaymentDateStr + (repaymentDateStr.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date(sanctionRawDate.getTime() + tenureDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const applicantName = userProfile?.fullName || 'AS PER PAN CARD';

    // Backend PDF Generation
    const handleDownloadPDF = async () => {
        const appId = application.id || application.applicationId;
        
        if (!appId) {
            console.error("No Application ID found for download", application);
            alert("Application ID is missing. Please refresh and try again.");
            return;
        }

        setIsGenerating(true);
        try {
            const apiUrl = apiClient.defaults.baseURL;
            const response = await fetch(`${apiUrl}/documents/sanction-letter/${appId}`, {
                method: 'GET',
                credentials: 'include', // Important: Send cookies
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Sanction_Letter_${primaryReference || application.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('PDF generation error:', error);
            alert("Failed to download PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center my-8">
             {/* Action Bar */}
             <div className="w-full max-w-[210mm] flex justify-end mb-4 gap-2 print:hidden px-4 md:px-0">
                <Button variant="outline" onClick={() => window.print()} className="gap-2">
                    <Printer className="w-4 h-4" /> Print
                </Button>
                <Button 
                    variant="default" 
                    className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800" 
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download PDF
                </Button>
            </div>

            {/* Document Container - A4 Scaled */}
            <div 
                ref={letterRef} 
                className="bg-white text-zinc-900 font-sans relative shadow-xl print:shadow-none print:border-0 print:m-0"
                style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    padding: '15mm',
                    margin: '0 auto',
                    boxSizing: 'border-box'
                }}
            >
                {/* Watermark */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0 select-none overflow-hidden">
                    <div className="transform -rotate-45 text-6xl md:text-8xl font-black whitespace-nowrap text-zinc-900 uppercase">
                        {BRAND_NAME}
                    </div>
                </div>

                {/* Header */}
                <div className="relative z-10 border-b-2 border-zinc-800 pb-4 mb-6 flex justify-between items-start">
                    <div className="flex flex-col">
                        <img src={LOGO_URL} alt="Company Logo" className="h-10 w-auto object-contain mb-2 self-start" />
                        <h1 className="text-xl font-bold uppercase tracking-wider text-zinc-900 mt-2">Sanction Letter</h1>
                        <p className="text-xs text-zinc-500 font-medium">KFS Cum Sanction Letter (Digital)</p>
                    </div>
                    <div className="text-right text-[10px] text-zinc-600 leading-tight">
                        <p className="font-bold text-zinc-900 text-sm mb-0.5">{BRAND_NAME}</p>
                        <p className="text-[9px] text-zinc-500 mb-1">{UMBRELLA_LINE}</p>
                        <p>CIN: {CIN_NO}</p>
                        <p className="max-w-[200px] ml-auto">Regd. Office: {ADDRESS}</p>
                        <p className="max-w-[200px] ml-auto">Delhi Office: {DELHI_ADDRESS}</p>
                        <p>Web: {WEBSITE_URL}</p>
                        <p className="mt-1">Date: {sanctionDate}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 space-y-6 text-xs leading-relaxed">
                    
                    {/* Salutation & Intro */}
                    <div>
                        <p className="font-bold">Dear {applicantName},</p>
                        <p className="mt-1 font-semibold text-zinc-800">
                            Name of the Regulated entity: {NBFC_NAME} (operating the {BRAND_NAME} brand)
                        </p>
                        <p className="mt-2 text-justify">
                            We are pleased to inform you that, based on the details provided, we have sanctioned a loan of{' '}
                            <span className="font-bold">₹{loanAmount.toLocaleString('en-IN')}</span> in your favour.
                            This document serves as your Key Fact Statement (KFS) and Sanction Letter.
                        </p>
                    </div>

                    {/* Key Fact Statement (KFS) Table */}
                    <div className="border border-zinc-800 rounded-sm overflow-hidden">
                        <div className="bg-zinc-800 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide">Key Fact Statement (KFS)</div>
                        <table className="w-full text-xs border-collapse">
                            <tbody>
                                {loanAccountNumber ? (
                                <tr className="border-b border-zinc-300">
                                    <td className="p-2 border-r border-zinc-300 font-semibold w-1/3 bg-zinc-50">Loan account no.</td>
                                    <td className="p-2 font-mono font-semibold">{loanAccountNumber}</td>
                                </tr>
                                ) : leadId ? (
                                <tr className="border-b border-zinc-300">
                                    <td className="p-2 border-r border-zinc-300 font-semibold w-1/3 bg-zinc-50">Lead ID</td>
                                    <td className="p-2 font-mono">{leadId}</td>
                                </tr>
                                ) : null}
                                {productName ? (
                                <tr className="border-b border-zinc-300">
                                    <td className="p-2 border-r border-zinc-300 font-semibold bg-zinc-50">Loan product</td>
                                    <td className="p-2">{productName}</td>
                                </tr>
                                ) : null}
                                <tr className="border-b border-zinc-300">
                                    <td className="p-2 border-r border-zinc-300 font-semibold w-1/3 bg-zinc-50">Loan amount</td>
                                    <td className="p-2 font-bold text-base">₹{loanAmount.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="border-b border-zinc-300">
                                    <td className="p-2 border-r border-zinc-300 font-semibold bg-zinc-50">Interest rate (annualized)</td>
                                    <td className="p-2">{annualizedRate}% per annum ({dailyInterestRate}% per day)</td>
                                </tr>
                                <tr className="border-b border-zinc-300">
                                    <td className="p-2 border-r border-zinc-300 font-semibold bg-zinc-50">Tenure</td>
                                    <td className="p-2">{tenureDays} Days</td>
                                </tr>
                                <tr className="border-b border-zinc-300">
                                    <td className="p-2 border-r border-zinc-300 font-semibold bg-zinc-50 align-top">
                                        Total Fees & Charges<br/>
                                        <span className="font-normal text-[10px] text-zinc-500">(Incl. GST @ 18%)</span>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex justify-between border-b border-dashed border-zinc-200 pb-1 mb-1">
                                            <span>Platform Fee (@{platformFeePercent}%)</span>
                                            <span>₹{Number(platformFeeAmount).toLocaleString('en-IN', { minimumFractionDigits: platformFeeAmount % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dashed border-zinc-200 pb-1 mb-1">
                                            <span>GST @ 18%</span>
                                            <span>₹{Number(gstOnFees).toLocaleString('en-IN', { minimumFractionDigits: gstOnFees % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-zinc-200">
                                            <span>Total Deductible (incl. GST)</span>
                                            <span>₹{Number(totalDeductible).toLocaleString('en-IN', { minimumFractionDigits: totalDeductible % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr className="border-b border-zinc-300 bg-green-50">
                                    <td className="p-2 border-r border-zinc-300 font-bold text-green-800">Net Disbursal Amount</td>
                                    <td className="p-2 font-bold text-green-800 text-lg">₹{Number(netDisbursement).toLocaleString('en-IN', { minimumFractionDigits: netDisbursement % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                                <tr className="border-b border-zinc-300 bg-blue-50">
                                    <td className="p-2 border-r border-zinc-300 font-bold text-blue-900">Total Repayment Amount</td>
                                    <td className="p-2 font-bold text-blue-900 text-lg">₹{Number(totalRepayment).toLocaleString('en-IN', { minimumFractionDigits: totalRepayment % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                                <tr className="border-b border-zinc-300">
                                    <td className="p-2 border-r border-zinc-300 font-semibold bg-zinc-50">Repayment Date</td>
                                    <td className="p-2 font-medium">{repaymentDate}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border-r border-zinc-300 font-semibold bg-zinc-50 align-top">
                                        Grievance Redressal Officer (Nodal)<br/>
                                        <span className="font-normal text-[10px] text-zinc-500">For FinTech/ digital lending related complaints</span>
                                    </td>
                                    <td className="p-2">
                                        <span className="font-semibold">{GRIEVANCE_OFFICER.name}</span><br/>
                                        Official No.: {GRIEVANCE_OFFICER.phone}<br/>
                                        Email: {GRIEVANCE_OFFICER.email}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Detailed Terms & Conditions */}
                    <div className="space-y-4 text-justify">
                        <h3 className="font-bold border-b border-zinc-300 pb-1 uppercase text-zinc-700 mt-6">Terms and Conditions</h3>
                        <div className="space-y-2">
                            <p>The Borrower confirms to have read and understood these Terms of Agreement before accepting a personal loan ("Loan") offer with us. By clicking on the "eSign" button, the Borrower shall be deemed to have electronically accepted these Terms of Agreement.</p>
                            <p>To the extent of any inconsistency, these Terms of Agreement shall prevail.</p>
                            <ol className="list-decimal pl-5 space-y-1">
                                <li>The Loan shall carry a fixed rate of interest specified at the time of applying for the loan.</li>
                                <li>The Loan amount shall be disbursed, after debiting processing fees, in Borrower's account only with the Bank on accepting the Personal Loan Terms of Agreement.</li>
                                <li>The repayment amount shall consist of principal and interest components. The Borrower confirms to repay the repayment amount on the specified repayment date.</li>
                                <li>If repayment is not done by the specified date, the Borrower will be liable for penal interest.</li>
                                <li>If any repayment cheque is not honored, the Borrower will be liable for dishonor charges and penal interest.</li>
                                <li>The Borrower agrees to pay the processing fee, payment dishonor charges, etc.</li>
                                <li>Any overdue payment incurs interest at the penal interest rate (which is higher than the usual interest rate). We may change the interest rate if required by the statutory/regulatory authority.</li>
                                <li>The Borrower agrees that fees and charges specified may be revised from time to time and binding on the Borrower.</li>
                                <li>The Borrower agrees to pay applicable Goods and Service Tax.</li>
                            </ol>
                        </div>

                        <h4 className="font-bold text-zinc-800 mt-4">Borrower Representations</h4>
                        <p>The Borrower represents and covenants that the Borrower:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>will use the Loan amount for legitimate purposes.</li>
                            <li>will not use the Loan for any speculative, antisocial, or prohibited purposes. If the Loan funds have been used for purposes as stated above, we shall be entitled to do all acts and things that we deem necessary to comply with its policies. The Borrower agrees to bear all costs and expenses incurs as a result thereof.</li>
                            <li>shall notify, within 7 calendar days, if any information given by the Borrower changes. In the specific event of a change in address due to relocation or any other reason, the Borrower shall intimate the new address as soon as possible but no later than 15 days of such a change.</li>
                            <li>information of the Borrower with us is correct, complete, and updated.</li>
                            <li>has read and understood the Privacy Policy available on our website.</li>
                        </ul>

                        <h4 className="font-bold text-zinc-800 mt-4">Notice</h4>
                        <p>
                            We may send Loan-related notices, statements, or any other communication to the Borrower by in-app messages, short message system (SMS), Whatsapp messaging service, electronic mail, ordinary prepaid post, or personal delivery to Borrower's registered communication address. Communication and notices sent by in-app messages/facsimile/SMS/email will be considered to have been sent and received by the Borrower on the same day irrespective of carrier delays. Communication and notices sent by pre-paid mail will be considered to have been delivered on the day immediately after the date of posting.
                        </p>
                    </div>

                    {/* Consent to Disclose */}
                    <div className="space-y-2 text-justify page-break-inside-avoid">
                        <h3 className="font-bold border-b border-zinc-300 pb-1 uppercase text-zinc-700 mt-6">Consent to Disclose</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Verification &amp; Credit Bureau Consent:</strong> By applying through the Lender's portal and authenticating through SMS/WhatsApp/Email OTP, the Borrower authorizes the Lender and its authorized partners to obtain credit bureau reports and conduct necessary KYC, document, employment, salary, banking and reference verification for loan processing, monitoring and servicing, subject to applicable laws.</li>
                            <li>The Borrower has no objection in and gives consent for sharing Loan details including Borrower's personal details to branches, affiliates, services providers, agents, contractors, surveyors, agencies, credit bureaus, etc. in or outside India, to enable us to provide services under the arrangement with the third parties including customized solutions and marketing services. The Borrower confirms that the authorization given above shall be valid till written communication of withdrawal of Borrower's consent is acknowledged by us.</li>
                            <li>The Borrower understands and accepts the risks involved in sharing personal information including sensitive personal information like account details with a third party.</li>
                            <li>The Borrower consents to share Borrower's personal information with third parties for processing, statistical or risks analysis, conducting credit or anti-money laundering checks, designing financial services or related products, marketing financial services or related products, customer recognition on our website/app, offering relevant product and service offers to customers, etc.</li>
                            <li>The Borrower agrees that we may disclose Borrower's information to the Reserve Bank of India, other statutory/regulatory authorities, arbitrator, credit bureaus, local authorities, credit rating agency, information utility, marketing agencies, and service providers if required.</li>
                            <li>The Borrower authorizes to provide monthly details of the Loan Account and the credit facilities extended to the Borrower to credit information companies. We may obtain information on credit facilities availed by the Borrower from other financial institutions to determine whether we can extend additional credit facilities. On the regularization of the Borrowers account, we will update the credit information companies accordingly.</li>
                            <li>The Borrower authorizes to verify any of the information of the Borrower including Borrower's credit standing from anyone we may consider appropriate including credit bureaus, local authority, credit rating agencies etc.</li>
                            <li>The Borrower authorizes us to inform Borrower's employer of any default in repayment and agrees to do things necessary to fulfill Borrower's obligations.</li>
                            <li>Our records about the Loan shall be conclusive and binding on the Borrower.</li>
                            <li>In case of default in repayment of the Loan amount, Borrower authorizes us and our collection assistance specialist engaged, to contact Borrower over phone, office or visit Borrower's residence or such other place where Borrower is located.</li>
                            <li><strong>Reference Contact in Default:</strong> In case of repayment default, the Borrower authorizes the Lender to contact the references provided by the Borrower, including friends/family, solely for establishing contact and facilitating repayment, subject to applicable laws and regulatory guidelines.</li>
                        </ul>
                    </div>

                    {/* Effective Date & Assignment */}
                    <div className="space-y-4 text-justify page-break-inside-avoid text-xs mt-4 border-t border-zinc-200 pt-4">
                        <div>
                             <span className="font-bold uppercase">Effective Date – </span> 
                             These Terms of Agreement shall be effective from the date of disbursal of the loan amount.
                        </div>
                        <div>
                             <span className="font-bold uppercase">Assignment – </span> 
                             The Borrower agrees that, with or without intimation to the Borrower, be authorized to sell and /or assign to any third party, the Loan and all outstanding dues under this Agreement, in any manner, in whole or in part, and on such terms as we may decide. Any such sale or assignment shall bind the Borrower, and the Borrower shall accept the third party as its sole creditor or creditor jointly with us.
                        </div>
                         <div>
                             <span className="font-bold uppercase">Governing Law & Jurisdiction – </span> 
                             The Loan shall be governed by the laws of India and all claims and disputes arising out of or in connection with the Loan shall be settled by arbitration. Any arbitration award/ direction passed shall be final and binding on the parties. The language of the arbitration shall be English/Hindi and the venue of such arbitration shall be in New Delhi.
                        </div>
                     </div>
                </div>

                {/* Footer Section: Signatures & Codes */}
                <div className="relative z-10 mt-12 pt-4 flex justify-between items-end">
                    <div className="text-center relative">
                         {/* Digital Stamp CSS Fallback */}
                        <div className="relative w-24 h-24 rounded-full border-4 border-blue-800 flex items-center justify-center opacity-80 rotate-[-12deg] mx-auto mb-2">
                            <div className="absolute inset-0 rounded-full border border-blue-800 m-1"></div>
                            <div className="text-[8px] font-bold text-blue-800 text-center uppercase tracking-tighter leading-tight px-2">
                                Authorized Signatory<br/>
                                {NBFC_NAME}<br/>
                                New Delhi
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-900 font-bold uppercase">Authorized Signatory</p>
                        <p className="text-[9px] text-zinc-500">For {NBFC_NAME}</p>
                        <p className="text-[8px] text-zinc-400">Operating as {BRAND_NAME}</p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                         {/* QR Code */}
                        <div className="border border-zinc-200 p-2 bg-white inline-block rounded shadow-sm">
                            <QRCodeSVG 
                                value={`VERIFY|${primaryReference || application.id}|AMT:${loanAmount}|DATE:${sanctionDate}`} 
                                size={80} 
                                fgColor="#18181b"
                            />
                        </div>
                        <p className="text-[9px] text-zinc-400 mt-1 font-mono">
                            {primaryReference ? `Ref: ${primaryReference}` : 'Scan to verify'}<br/>
                            Scan to verify
                        </p>
                    </div>
                </div>

                {/* Page Footer */}
                <div className="absolute bottom-4 left-0 right-0 text-center text-[9px] text-zinc-400 border-t border-zinc-100 pt-2 mx-12">
                    System Generated Document | Date: {new Date().toLocaleString()} | {WEBSITE_URL} | Page 1 of 1
                </div>
            </div>
        </div>
    );
}
