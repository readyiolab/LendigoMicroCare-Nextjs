const normalizeRole = (role) =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

export const SETTLEMENT_CHECKER_ROLES = ['super_admin', 'operations_manager'];
export const SETTLEMENT_MAKER_ROLES = [
  'super_admin',
  'operations_manager',
  'collection_manager',
  'operations',
];

export function isSettlementChecker(admin) {
  const role = normalizeRole(admin?.role_code || admin?.role);
  return SETTLEMENT_CHECKER_ROLES.includes(role);
}

export function isSettlementMaker(admin) {
  const role = normalizeRole(admin?.role_code || admin?.role);
  return SETTLEMENT_MAKER_ROLES.includes(role);
}

export function canApproveSettlement(admin, settlement) {
  if (!isSettlementChecker(admin)) return false;
  if (!settlement || settlement.status !== 'pending_approval') return false;
  if (Number(settlement.requested_by_admin) === Number(admin?.id)) return false;
  return true;
}
