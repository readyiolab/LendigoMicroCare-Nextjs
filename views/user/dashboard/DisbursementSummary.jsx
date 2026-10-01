import { Building2 } from "lucide-react";

// Extracted outside Dashboard to prevent re-creation on every render
const DisbursementSummary = ({ application }) => {
  if (!application) return null;
  const amount = application.approved_amount || application.principal_amount;
  const bankDetails = application.bank_details || application.bankSummary;
  const maskedAccount =
    bankDetails?.account_number_masked ||
    (bankDetails?.account_number ? `XXXX${String(bankDetails.account_number).slice(-4)}` : null) ||
    '—';

  return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div className="flex flex-col">
              <p className="text-xs text-gray-500 font-medium mb-1">Approved loan amount</p>
              <div className="flex items-baseline gap-1">
                  <span className="text-sm font-medium text-gray-400">₹</span>
                  <p className="text-2xl font-semibold text-gray-900 tracking-tight">{parseFloat(amount || 0).toLocaleString('en-IN')}</p>
              </div>
          </div>
          <div className="flex flex-col">
              <p className="text-xs text-gray-500 font-medium mb-1">Destination bank account</p>
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                      <p className="text-sm font-semibold text-gray-800 leading-none mb-1">{bankDetails?.bank_name || 'Bank Account'}</p>
                      <p className="text-[11px] text-gray-400 font-medium tabular-nums tracking-wider">{maskedAccount}</p>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default DisbursementSummary;
