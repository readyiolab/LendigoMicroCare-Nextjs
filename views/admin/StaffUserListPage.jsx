import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@/lib/router';
import { roleAPI } from '@/lib/api/roles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Search, Pencil, Users, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminUi } from '@/config/adminUiTokens';
import { dbStatusToUi } from '@/lib/permissionUtils';
import { getApiErrorMessage } from '@/lib/apiErrorMessage';
import { format } from 'date-fns';
import AccessManagementTabs from '@/components/admin/access/AccessManagementTabs';

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 300;

function formatCreatedAt(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd-MM-yyyy h:mm:ss a');
  } catch {
    return dateStr;
  }
}

function formatUpdatedAt(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy, HH:mm:ss');
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status }) {
  const label = dbStatusToUi(status);
  const colors = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Inactive: 'bg-amber-50 text-amber-700 border-amber-100',
    Suspended: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <Badge className={cn('text-[10px] font-medium border shadow-none', colors[label] || 'bg-slate-50 text-slate-600')}>
      {label}
    </Badge>
  );
}

function UserAvatar({ user }) {
  const initials = user.full_name?.substring(0, 2).toUpperCase() || 'U';
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="w-8 h-8 rounded-full object-cover border border-slate-200"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-500">
      {initials}
    </div>
  );
}

export default function StaffUserListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: PAGE_SIZE });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const fetchGenRef = useRef(0);

  const fetchUsers = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await roleAPI.getAdminUsers({
        page,
        limit: PAGE_SIZE,
        q: search,
      });
      if (gen !== fetchGenRef.current) return;
      if (res.status === 1) {
        const payload = res.data || {};
        setUsers(payload.users || []);
        setPagination(payload.pagination || { total: 0, totalPages: 1, limit: PAGE_SIZE });
      }
    } catch (err) {
      if (gen !== fetchGenRef.current) return;
      setError(getApiErrorMessage(err, 'Failed to load users'));
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch((prev) => {
        if (prev === searchInput) return prev;
        setPage(1);
        return searchInput;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = pagination.totalPages || 1;
  const total = pagination.total || 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className={cn(adminUi.page, 'animate-in fade-in duration-300')}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 rounded-md">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className={adminUi.pageHeader}>User List</h2>
            <p className={adminUi.pageSubtitle}>Manage staff profiles, roles, and permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchUsers} variant="outline" className="h-9 px-3 rounded-md text-xs gap-2">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            onClick={() => navigate('/admin/staff-users/new')}
            className={cn('h-9 px-4 rounded-md gap-2 text-xs', adminUi.accent)}
          >
            <Plus className="w-4 h-4" /> Create Profile
          </Button>
        </div>
      </div>

      <AccessManagementTabs />

      {(error || message) && (
        <div className="space-y-2">
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, username, email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 h-9 rounded-md text-sm"
        />
      </div>

      <div className={adminUi.tableShell}>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading users...
          </div>
        ) : (
          <div className="[&_[data-slot=table-container]]:border-0">
          <Table>
            <TableHeader>
              <tr className={adminUi.tableHeader}>
                <TableHead className="text-[10px] font-semibold uppercase w-12" />
                <TableHead className="text-[10px] font-semibold uppercase">ID</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">Name</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">User Name</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">Email</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">Mobile</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">Branch</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">Role</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">Create At</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase">Updated At</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase text-right">Edit</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center text-slate-500">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : users.map((user) => (
                <TableRow
                  key={user.id}
                  className={cn(adminUi.tableRowHover, 'cursor-pointer')}
                  onClick={() => navigate(`/admin/staff-users/${user.id}/edit`)}
                >
                  <TableCell><UserAvatar user={user} /></TableCell>
                  <TableCell className="text-xs text-slate-600">{user.id}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {user.full_name}
                      {user.has_custom_permissions && (
                        <Badge className="text-[9px] bg-purple-50 text-purple-700 border-purple-100 shadow-none">
                          Custom
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{user.username || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600">{user.email}</TableCell>
                  <TableCell className="text-xs text-slate-600">{user.mobile || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600">{user.branch_name || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600">{user.role_name || user.role}</TableCell>
                  <TableCell><StatusBadge status={user.status} /></TableCell>
                  <TableCell className="text-[11px] text-slate-500 whitespace-nowrap">{formatCreatedAt(user.created_at)}</TableCell>
                  <TableCell className="text-[11px] text-slate-500 whitespace-nowrap">{formatUpdatedAt(user.updated_at)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => navigate(`/admin/staff-users/${user.id}/edit`)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className={cn('flex items-center justify-between text-xs px-0 py-2', adminUi.tablePagination)}>
          <span>Showing {from}–{to} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-md" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="rounded-md" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
