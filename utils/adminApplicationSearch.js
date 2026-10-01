import {
  account360Path,
  customerHistoryPath,
  isCustomerHistoryQuery,
  isLoanAccountQuery,
} from '@/utils/customerIdentity';

export function resolveAdminApplicationSearch(navigate, query) {
  const q = String(query || '').trim();
  if (!q) return;
  if (isLoanAccountQuery(q)) {
    navigate(account360Path(q));
    return;
  }
  if (isCustomerHistoryQuery(q)) {
    navigate(customerHistoryPath(q));
    return;
  }
  navigate(`/admin/applications?search=${encodeURIComponent(q)}`);
}
