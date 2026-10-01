import { Navigate, useLocation } from '@/lib/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { DSA_PARTNER_UI_ENABLED } from '@/config/featureFlags';

const DSA_PARTNER_ALLOWED_PREFIXES = [
  '/admin/dsa',
  '/admin/applications/fill',
];

/**
 * DSA partners only manage leads and assisted application fill (same as telecaller fill flow).
 * Block full admin application review, dashboard, etc.
 * When DSA Partner UI is disabled, treat them like normal staff (no DSA-only lock-in).
 */
export function DsaPartnerRouteGuard({ children }) {
  const { admin } = useAdminAuth();
  const location = useLocation();

  const roleKey = String(admin?.role_code || admin?.role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (!DSA_PARTNER_UI_ENABLED || roleKey !== 'dsa') {
    return children;
  }

  const path = location.pathname;
  const allowed = DSA_PARTNER_ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (!allowed) {
    return <Navigate to="/admin/dsa/leads" replace />;
  }

  return children;
}

export function isDsaPartnerRole(admin) {
  if (!DSA_PARTNER_UI_ENABLED) return false;
  const roleKey = String(admin?.role_code || admin?.role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return roleKey === 'dsa';
}

export function dsaPartnerHomePath() {
  return DSA_PARTNER_UI_ENABLED ? '/admin/dsa/leads' : '/admin/dashboard';
}
