import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from '@/lib/router';
import { roleAPI } from '@/lib/api/roles';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar
} from 'lucide-react';

import RoleTable from '@/components/admin/roles/RoleTable';
import StatusTable from '@/components/admin/roles/StatusTable';
import AccessManagementTabs from '@/components/admin/access/AccessManagementTabs';
import { getApiErrorMessage } from '@/lib/apiErrorMessage';
import { DsaTableSkeleton } from '@/components/admin/dsa/DsaStatSkeleton';

const AdminRoleManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [roles, setRoles] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const initialTab = searchParams.get('tab') === 'statuses' ? 'statuses' : 'roles';
  const [activeTab, setActiveTab] = useState(initialTab);
  const rolesLoadedRef = useRef(false);
  const statusesLoadedRef = useRef(false);

  const fetchRoles = useCallback(async () => {
    const res = await roleAPI.getRoles({ slim: 'true' });
    if (res.status === 1) {
      setRoles(res.data || []);
      rolesLoadedRef.current = true;
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    const res = await roleAPI.getAllStatuses();
    if (res.status === 1) {
      setStatuses(res.data || []);
      statusesLoadedRef.current = true;
    }
  }, []);

  const fetchData = useCallback(async (force = false) => {
    const needsFetch =
      (activeTab === 'roles' && (force || !rolesLoadedRef.current)) ||
      (activeTab === 'statuses' && (force || !statusesLoadedRef.current));

    if (!needsFetch) return;

    setLoading(true);
    setError('');
    try {
      if (activeTab === 'roles') {
        await fetchRoles();
      } else if (activeTab === 'statuses') {
        await fetchStatuses();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load team data'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchRoles, fetchStatuses]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    const tab = searchParams.get('tab') === 'statuses' ? 'statuses' : 'roles';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'statuses') {
      setSearchParams({ tab: 'statuses' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  const handleRefresh = useCallback(() => {
    setMessage('');
    if (activeTab === 'roles') rolesLoadedRef.current = false;
    if (activeTab === 'statuses') statusesLoadedRef.current = false;
    fetchData(true);
  }, [activeTab, fetchData]);

  const handleDeleteRole = useCallback(async (roleId) => {
    if (!window.confirm('Confirm permanent removal of this institutional role?')) return;
    setError('');
    setMessage('');
    try {
      const res = await roleAPI.deleteRole(roleId);
      if (res.status === 1) {
        setMessage('Role removed successfully');
        rolesLoadedRef.current = false;
        await fetchData(true);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete role.'));
    }
  }, [fetchData]);

  const memoTabs = useMemo(() => [
    { id: 'roles', label: 'Staff Roles', icon: Shield },
    { id: 'statuses', label: 'Status Types', icon: Key },
  ], []);

  const currentDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const showTabSkeleton =
    loading &&
    ((activeTab === 'roles' && roles.length === 0) ||
      (activeTab === 'statuses' && statuses.length === 0));

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 rounded-md">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Access & Role Management</h2>
            <p className="text-slate-500 text-sm">Manage roles and loan stage visibility</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-[10px] font-medium text-slate-500 bg-white px-3 py-1.5 rounded-md border border-slate-300">
            <Calendar className="w-3.5 h-3.5" />
            <span>{currentDateStr}</span>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="h-9 px-3 rounded-md text-xs gap-2"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <AccessManagementTabs />

      {(error || message) && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
          {error && (
            <Alert variant="destructive" className="rounded-md border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 text-sm">{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="rounded-md border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-900 text-sm">{message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Tabs value={activeTab} className="w-full space-y-3" onValueChange={handleTabChange}>
        <TabsList className="bg-white p-0.5 h-auto rounded-md border border-slate-300 flex items-center gap-0.5 w-fit">
          {memoTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors data-[state=active]:bg-slate-900 data-[state=active]:text-white border-none cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="roles" className="mt-0 ring-0 outline-none">
          {showTabSkeleton && activeTab === 'roles' ? (
            <DsaTableSkeleton rows={6} cols={4} />
          ) : (
            <RoleTable
              roles={roles}
              onDeleteRole={handleDeleteRole}
              onAddRole={() => navigate('/admin/roles/new')}
              onEditRole={(roleId) => navigate(`/admin/roles/${roleId}/edit`)}
            />
          )}
        </TabsContent>

        <TabsContent value="statuses" className="mt-0 ring-0 outline-none">
          {showTabSkeleton && activeTab === 'statuses' ? (
            <DsaTableSkeleton rows={6} cols={3} />
          ) : (
            <StatusTable statuses={statuses} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRoleManagement;
