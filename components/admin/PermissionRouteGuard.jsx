import { useEffect, useRef } from 'react';
import { Navigate } from '@/lib/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { hasPermission } from '@/lib/permissionUtils';
import { canOpenLoanBookMis } from '@/config/adminNavigation';

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * Blocks custom-permission staff from routes they were not granted in the module matrix.
 * Super Admin bypasses; role-only staff rely on API enforcement.
 */
export function PermissionRouteGuard({ permissionCode, action = 'can_view', children }) {
  const { admin } = useAdminAuth();
  const { toast } = useNotifications();
  const notifiedRef = useRef(false);

  const roleKey = normalizeRole(admin?.role_code || admin?.role);
  const isSuperAdmin = roleKey === 'super_admin';
  const isOrgAdmin = roleKey === 'org_admin';
  const mapReady = !!(admin?.permissionMap && Object.keys(admin.permissionMap).length);
  const orgAdminViewOnly = action === 'can_view' && (permissionCode === 'admin.users' || permissionCode === 'admin.roles');
  const orgAdminAllowed = mapReady
    ? hasPermission(admin.permissionMap, permissionCode, action)
    : orgAdminViewOnly;

  const allowed = isSuperAdmin
    || (isOrgAdmin && orgAdminAllowed)
    || (!isOrgAdmin && !admin?.has_custom_permissions)
    || (!isOrgAdmin && hasPermission(admin?.permissionMap, permissionCode, action));

  useEffect(() => {
    if (!allowed && (admin?.has_custom_permissions || isOrgAdmin) && !notifiedRef.current) {
      notifiedRef.current = true;
      toast('Access denied', 'You do not have permission to open this page.');
    }
  }, [allowed, admin?.has_custom_permissions, isOrgAdmin, permissionCode, toast]);

  if (!allowed) {
    return <Navigate to={isOrgAdmin ? '/admin/staff-users' : '/admin/dashboard'} replace />;
  }

  return children;
}

export function LoanBookMisGuard({ children }) {
  const { admin } = useAdminAuth();
  const { toast } = useNotifications();
  const notifiedRef = useRef(false);
  const roleKey = normalizeRole(admin?.role_code || admin?.role);
  const allowed = canOpenLoanBookMis(roleKey, admin?.permissionMap);

  useEffect(() => {
    if (!allowed && admin && !notifiedRef.current) {
      notifiedRef.current = true;
      toast('Access denied', 'You do not have permission to open Loan Book MIS.');
    }
  }, [allowed, admin, toast]);

  if (!allowed) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
