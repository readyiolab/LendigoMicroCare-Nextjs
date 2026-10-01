import { useEffect, useRef } from 'react';
import { Navigate } from '@/lib/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { hasPermission } from '@/lib/permissionUtils';

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
export function PermissionRouteGuard({ permissionCode, children }) {
  const { admin } = useAdminAuth();
  const { toast } = useNotifications();
  const notifiedRef = useRef(false);

  const roleKey = normalizeRole(admin?.role_code || admin?.role);
  const isSuperAdmin = roleKey === 'super_admin';

  const allowed = isSuperAdmin
    || !admin?.has_custom_permissions
    || hasPermission(admin?.permissionMap, permissionCode, 'can_view');

  useEffect(() => {
    if (!allowed && admin?.has_custom_permissions && !notifiedRef.current) {
      notifiedRef.current = true;
      toast('Access denied', 'You do not have permission to open this page.');
    }
  }, [allowed, admin?.has_custom_permissions, permissionCode, toast]);

  if (!allowed) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
