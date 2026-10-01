import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from '@/lib/router';
import { roleAPI } from '@/lib/api/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import AdminFormShell from '@/components/admin/access/AdminFormShell';
import StaffPhotoCard from '@/components/admin/access/StaffPhotoCard';
import PermissionMatrixPanel from '@/components/admin/access/PermissionMatrixPanel';
import RoleWorkflowPicker from '@/components/admin/access/RoleWorkflowPicker';
import {
  permissionsArrayToMap,
  permissionMapToFullArray,
  UI_STATUS_OPTIONS,
  countPermissionSummary,
} from '@/lib/permissionUtils';
import { getApiErrorMessage } from '@/lib/apiErrorMessage';
import { uploadToS3 } from '@/lib/services/cloudinaryUpload';
import { cn } from '@/lib/utils';
import { getWorkflowCard, sortRolesForStaffPicker } from '@/config/workflowRolePresets';

const EMPTY_FORM = {
  full_name: '',
  email: '',
  mobile: '',
  username: '',
  password: '',
  branch_id: '',
  role_id: '',
  status: 'active',
  avatar_url: '',
};

const fieldLabelClass = 'text-sm font-medium text-slate-700';
const fieldControlClass =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200';
const nativeSelectClass =
  'w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200';

function FormSection({ title, children }) {
  return (
    <section className="rounded-md border border-slate-300 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-300">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className={fieldLabelClass}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 14; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function StaffUserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionMap, setPermissionMap] = useState({});
  const [customizePermissions, setCustomizePermissions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sortedRoles = useMemo(() => sortRolesForStaffPicker(roles), [roles]);

  const selectedRole = useMemo(
    () => roles.find((r) => String(r.id) === String(form.role_id)) || null,
    [roles, form.role_id]
  );

  const selectedRoleName = selectedRole?.role_name || '';
  const workflowCard = useMemo(
    () => (selectedRole ? getWorkflowCard(selectedRole.role_code, selectedRole.workflow) : null),
    [selectedRole]
  );

  const permSummary = useMemo(() => countPermissionSummary(permissionMap), [permissionMap]);

  const loadMeta = useCallback(async () => {
    const [branchRes, roleRes] = await Promise.all([
      roleAPI.getBranches(),
      roleAPI.getRoles({ slim: 'true' }),
    ]);
    if (branchRes.status === 1) setBranches(branchRes.data || []);
    if (roleRes.status === 1) setRoles(roleRes.data || []);
  }, []);

  const loadUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await roleAPI.getAdminUser(id);
      if (res.status === 1) {
        const u = res.data;
        setForm({
          full_name: u.full_name || '',
          email: u.email || '',
          mobile: u.mobile || '',
          username: u.username || '',
          password: '',
          branch_id: u.branch_id ? String(u.branch_id) : '',
          role_id: u.role_id ? String(u.role_id) : '',
          status: u.status || 'active',
          avatar_url: u.avatar_url || '',
        });
        setAvatarPreview(u.avatar_url || '');
        const hasCustom = !!u.has_custom_permissions;
        setCustomizePermissions(hasCustom);
        setShowAdvanced(hasCustom);
        setPermissionMap(permissionsArrayToMap(
          hasCustom ? (u.effective_permissions || u.user_overrides) : u.role_permissions
        ));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load user'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadUser(); }, [loadUser]);

  const handleRoleChange = async (roleId) => {
    setForm((f) => ({ ...f, role_id: roleId }));
    if (!roleId || customizePermissions) return;
    try {
      const res = await roleAPI.getRole(roleId);
      if (res.status === 1) {
        setPermissionMap(permissionsArrayToMap(res.data.permissions || []));
        // Enrich slim role list with workflow from full role payload
        if (res.data?.workflow) {
          setRoles((prev) =>
            prev.map((r) =>
              String(r.id) === String(roleId) ? { ...r, workflow: res.data.workflow } : r
            )
          );
        }
      }
    } catch {
      // ignore
    }
  };

  const handleCustomizeChange = (enabled) => {
    setCustomizePermissions(enabled);
    if (enabled) setShowAdvanced(true);
    if (!enabled && form.role_id) {
      handleRoleChange(form.role_id);
    }
  };

  const handleAvatarChange = (file) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.full_name || !form.email || (!isEdit && !form.password) || !form.role_id || !form.branch_id) {
      setError('Please fill all required fields (name, email, branch, role' + (isEdit ? ').' : ', password).'));
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = form.avatar_url;
      if (avatarFile) {
        const uploaded = await uploadToS3(avatarFile, { category: 'selfies' });
        avatarUrl = uploaded.url;
      }

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.replace(/\D/g, ''),
        username: form.username.trim() || null,
        branch_id: Number(form.branch_id),
        role_id: Number(form.role_id),
        status: form.status,
        avatar_url: avatarUrl || null,
        customize_permissions: customizePermissions,
        permissions: customizePermissions ? permissionMapToFullArray(permissionMap) : [],
      };

      if (form.password) payload.password = form.password;

      const res = isEdit
        ? await roleAPI.updateAdminUser(id, payload)
        : await roleAPI.createAdminUser(payload);

      if (res.status === 1) {
        navigate('/admin/staff-users');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save user'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <AdminFormShell
      title={isEdit ? 'Edit Staff User' : 'Create Staff User'}
      subtitle={isEdit ? 'Update profile and role' : 'Add a team member by choosing their job in the loan flow'}
      showIcon={false}
      onBack={() => navigate('/admin/staff-users')}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/staff-users')}
            className="h-10 px-5 rounded-lg text-sm border-slate-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-5 rounded-lg text-sm bg-slate-900 text-white hover:bg-slate-800 gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <div className="space-y-6 w-full">
        {error && (
          <Alert variant="destructive" className="rounded-lg border-red-100 bg-red-50/50 p-4">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <FormSection title="Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Full Name *" htmlFor="full_name">
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={fieldControlClass}
              />
            </Field>
            <Field label="Email *" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={fieldControlClass}
              />
            </Field>
            <Field label="Mobile *" htmlFor="mobile" className="sm:col-span-1">
              <Input
                id="mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className={fieldControlClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Account Credentials">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Username" htmlFor="username">
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={fieldControlClass}
                placeholder="Login username (optional)"
              />
            </Field>
            <Field label={`Password ${isEdit ? '(leave blank to keep)' : '*'}`} htmlFor="password">
              <div className="flex gap-3">
                <Input
                  id="password"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={cn(fieldControlClass, 'flex-1')}
                  placeholder={isEdit ? 'Optional new password' : 'Min 8 characters'}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 text-sm shrink-0 rounded-lg border-slate-200"
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                >
                  Auto Generate
                </Button>
              </div>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Organization">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Branch *" htmlFor="branch_id">
                <select
                  id="branch_id"
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  className={nativeSelectClass}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>{b.branch_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status *">
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {UI_STATUS_OPTIONS.map((opt) => {
                    const selected = form.status === opt.value;
                    const styles = {
                      active: selected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                      inactive: selected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
                      blocked: selected
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
                    };
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, status: opt.value })}
                        className={cn(
                          'h-10 px-4 rounded-lg border text-sm font-medium transition-colors',
                          styles[opt.value] || 'bg-slate-50 text-slate-700 border-slate-200'
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection title="Role in loan journey *">
          <RoleWorkflowPicker
            roles={sortedRoles}
            value={form.role_id}
            onChange={(roleId) => handleRoleChange(roleId)}
          />
          {workflowCard && !customizePermissions && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                <strong>{selectedRoleName}</strong> inherits the built-in preset
                {permSummary.counts.can_view > 0
                  ? ` (${permSummary.counts.can_view} screens with view access)`
                  : ''}
                . Loan stage actions (recommend / offer / disburse) are enforced by this role —
                not by the permission checkboxes.
              </p>
            </div>
          )}
        </FormSection>

        <StaffPhotoCard avatarUrl={avatarPreview} onAvatarChange={handleAvatarChange} />

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Advanced: customize module access</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Optional. Changes which screens this person sees — does not change who can recommend, send offers, or disburse.
              </p>
            </div>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            )}
          </button>
          {showAdvanced && (
            <div className="border-t border-slate-200 p-4">
              <PermissionMatrixPanel
                title="Module access override"
                permissionMap={permissionMap}
                onPermissionMapChange={setPermissionMap}
                disabled={!customizePermissions}
                showCustomizeToggle
                customizeEnabled={customizePermissions}
                onCustomizeChange={handleCustomizeChange}
                inheritRoleName={selectedRoleName}
              />
            </div>
          )}
        </div>
      </div>
    </AdminFormShell>
  );
}
