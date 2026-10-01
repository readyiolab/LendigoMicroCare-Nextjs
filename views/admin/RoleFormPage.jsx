import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from '@/lib/router';
import { roleAPI } from '@/lib/api/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Key, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import AdminFormShell from '@/components/admin/access/AdminFormShell';
import PermissionMatrixPanel from '@/components/admin/access/PermissionMatrixPanel';
import AccessToggle from '@/components/admin/access/AccessToggle';
import {
  permissionsArrayToMap,
  permissionMapToArray,
  grantFullControl,
  buildEmptyPermissionMap,
} from '@/lib/permissionUtils';
import { getApiErrorMessage } from '@/lib/apiErrorMessage';
import { getWorkflowCard } from '@/config/workflowRolePresets';

const BUILTIN_ROLE_CODES = new Set([
  'super_admin',
  'telecaller',
  'credit_manager',
  'underwriter',
  'operations',
  'operations_manager',
  'collection_manager',
]);

export default function RoleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    role_code: '',
    role_name: '',
    description: '',
    isFullControl: false,
    status_access: [],
  });
  const [permissionMap, setPermissionMap] = useState(buildEmptyPermissionMap());
  const [statuses, setStatuses] = useState([]);
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isBuiltin = BUILTIN_ROLE_CODES.has(form.role_code);
  const workflowCard = useMemo(
    () => (form.role_code ? getWorkflowCard(form.role_code, workflow) : null),
    [form.role_code, workflow]
  );

  const loadStatuses = useCallback(async () => {
    const res = await roleAPI.getAllStatuses();
    if (res.status === 1) setStatuses(res.data || []);
  }, []);

  const loadRole = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await roleAPI.getRole(id);
      if (res.status === 1) {
        const role = res.data;
        const perms = role.permissions || [];
        const allFull = perms.length > 0 && perms.every((p) => p.can_view && p.can_create && p.can_edit && p.can_delete);
        setForm({
          role_code: role.role_code || '',
          role_name: role.role_name || '',
          description: role.description || '',
          isFullControl: allFull,
          status_access: (role.status_access || []).map((s) => s.status_code),
        });
        setPermissionMap(permissionsArrayToMap(perms));
        setWorkflow(role.workflow || null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load role'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);
  useEffect(() => { loadRole(); }, [loadRole]);

  const toggleStatus = (code) => {
    setForm((f) => ({
      ...f,
      status_access: f.status_access.includes(code)
        ? f.status_access.filter((s) => s !== code)
        : [...f.status_access, code],
    }));
  };

  const handleFullControl = (checked) => {
    if (checked) {
      setPermissionMap(grantFullControl());
      setForm((f) => ({
        ...f,
        isFullControl: true,
        status_access: statuses.map((s) => s.status_code),
      }));
    } else {
      setForm((f) => ({ ...f, isFullControl: false }));
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.role_name) {
      setError('Role name is required');
      return;
    }

    setSaving(true);
    try {
      const slug = form.role_name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const payload = {
        role_code: isEdit ? form.role_code : slug,
        role_name: form.role_name,
        description: form.description,
        permissions: permissionMapToArray(permissionMap),
        status_access: form.isFullControl
          ? statuses.map((s) => ({ status_code: s.status_code, can_view: 1, can_update: 1 }))
          : form.status_access.map((code) => ({ status_code: code, can_view: 1, can_update: 1 })),
      };

      const res = isEdit
        ? await roleAPI.updateRole(id, payload)
        : await roleAPI.createRole(payload);

      if (res.status === 1) {
        navigate('/admin/roles');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save role'));
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
      title={isEdit ? 'Edit Role' : 'Create Role'}
      subtitle="Module screens vs loan-stage authority"
      icon={Shield}
      onBack={() => navigate('/admin/roles')}
      headerRight={
        <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          <Label className="text-xs font-medium text-slate-600">Full Control</Label>
          <AccessToggle
            checked={form.isFullControl}
            aria-label="Full Control"
            onCheckedChange={handleFullControl}
          />
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => navigate('/admin/roles')} className="h-9 px-4 rounded-lg text-sm">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="h-9 px-4 rounded-lg text-sm bg-slate-900 text-white gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Role'}
          </Button>
        </>
      }
    >
      {error && (
        <Alert variant="destructive" className="rounded-md border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-slate-300 rounded-md shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Role Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Role Code</Label>
            <Input
              value={form.role_code}
              readOnly
              className="h-9 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
            />
            {isBuiltin && (
              <p className="text-[11px] text-slate-500">Built-in workflow role — code cannot change.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role Name *</Label>
            <Input
              value={form.role_name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                setForm({
                  ...form,
                  role_name: name,
                  role_code: isEdit || isBuiltin ? form.role_code : slug,
                });
              }}
              className="h-9 text-sm"
              placeholder="e.g. Risk Auditor"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="h-9 text-sm"
              placeholder="What can this role do?"
            />
          </div>
        </CardContent>
      </Card>

      {workflowCard?.summary && (
        <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="space-y-1 leading-relaxed">
            <p><strong>Workflow:</strong> {workflowCard.summary}</p>
            {workflowCard.next_handoff && (
              <p>Hands off to: {workflowCard.next_handoff}</p>
            )}
            <p className="text-blue-800/80">
              Changing module access below affects which screens appear. Recommend / offer / disburse authority
              still follows this role&apos;s built-in loan journey rules.
            </p>
          </div>
        </div>
      )}

      {form.isFullControl ? (
        <div className="p-4 bg-white rounded-md border border-slate-300 flex flex-col items-center text-center space-y-2">
          <div className="p-2.5 bg-slate-900 rounded-md">
            <Key className="w-5 h-5 text-white" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Full System Administrator</h4>
          <p className="text-xs text-slate-500 max-w-sm">Unrestricted access to all modules and loan pipeline statuses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-0.5">
              1. Module access (screens / data)
            </h3>
            <PermissionMatrixPanel
              title="Module Access"
              permissionMap={permissionMap}
              onPermissionMapChange={setPermissionMap}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-0.5">
              2. Loan stage visibility (which cases appear)
            </h3>
            <Card className="border-slate-300 rounded-md shadow-none xl:sticky xl:top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <CardTitle className="text-sm font-semibold">Loan Stage Visibility</CardTitle>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  Controls which application statuses this role can see in lists.
                  Actual approve / offer / disburse actions are still gated by role code on the server.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {statuses.map((status) => (
                    <div key={status.status_code} className="flex items-center space-x-2 bg-white p-2 rounded-md border border-slate-300">
                      <Checkbox
                        id={`stat-${status.status_code}`}
                        checked={form.status_access.includes(status.status_code)}
                        onCheckedChange={() => toggleStatus(status.status_code)}
                      />
                      <label htmlFor={`stat-${status.status_code}`} className="text-xs font-medium text-slate-700 cursor-pointer">
                        {status.status_name}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminFormShell>
  );
}
