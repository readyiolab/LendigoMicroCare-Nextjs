import { useState, useCallback, useMemo } from 'react';
import { adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchInput } from '@/components/ui/SearchInput';
import { Eye, User as UserIcon, RefreshCw, Users } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import UserDetailSheet from '@/components/admin/UserDetailSheet';
import { cn } from '@/lib/utils';
import { adminUi } from '@/config/adminUiTokens';

export default function AdminUsers() {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // --- Data Layer ---

  const fetchUsers = useCallback((query, signal) => {
    return adminAPI.getUsers(
      { page: 1, limit: 50, search: query || undefined },
      { signal }
    );
  }, []);

  const {
    results,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    refresh,
    refreshing,
    hasLoadedOnce
  } = useSearch(fetchUsers, { delay: 400, useCache: true });

  const users = results?.data?.users || [];
  const totalUsers = results?.data?.pagination?.total ?? users.length;


  // --- Logic Layer ---

  const handleViewUser = useCallback((userId) => {
    setSelectedUserId(userId);
    setIsSheetOpen(true);
  }, []);

  const getStatusBadge = useCallback((status) => {
    const config = {
      active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      blocked: 'bg-rose-50 text-rose-600 border-rose-100',
      inactive: 'bg-slate-50 text-slate-400 border-slate-100',
    };
    
    return (
      <Badge className={cn("font-medium px-2.5 py-0.5 rounded-full border shadow-none  text-[10px] uppercase tracking-widest", config[status] || config.inactive)}>
        {status}
      </Badge>
    );
  }, []);



  // --- Render Layer ---

  return (
    <div className="space-y-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="border border-slate-300 bg-white p-3 rounded-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-900 rounded-md">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">User Directory</h2>
                <p className="text-sm text-slate-500">Monitor and manage all system accounts.</p>
              </div>
           </div>
            <div className="flex items-center gap-2">
              <SearchInput
                placeholder="Search by Mobile, Email, or Name..."
                value={searchTerm}
                onChange={setSearchTerm}
                loading={loading}
                containerClassName="w-72"
              />
              <Button 
                onClick={refresh} 
                variant="outline" 
                className="h-9 w-9 p-0 rounded-md"
                disabled={loading || refreshing}
              >
                <RefreshCw className={cn("w-4 h-4", (loading || refreshing) && "animate-spin")} />
              </Button>
           </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-md border-red-200 bg-red-50 text-red-900 p-3">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border border-zinc-800 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-white">
           <h2 className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Platform Users
              {!loading || hasLoadedOnce ? (
                 <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-medium normal-case tracking-normal border border-slate-200">
                   {totalUsers} Accounts
                 </span>
              ) : (
                 <div className="w-16 h-4 bg-slate-100 rounded-md animate-pulse" />
              )}
           </h2>
        </div>

        <div className="[&_[data-slot=table-container]]:border-0">
          {loading && !hasLoadedOnce ? (
            <div className="p-4 space-y-2 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-white rounded-md" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
              <UserIcon className="h-8 w-8 text-slate-500 mb-2" />
              <p className="text-xs text-slate-500">No users found.</p>
            </div>
          ) : (
            <div className={cn("overflow-x-auto", loading && hasLoadedOnce && "opacity-60 pointer-events-none")}>
              <Table>
                <TableHeader>
                  <TableRow className={adminUi.tableHeader}>
                    <TableHead className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide">User ID</TableHead>
                    <TableHead className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide">Full Name & Contact</TableHead>
                    <TableHead className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide">Email Address</TableHead>
                    <TableHead className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-center">Account Status</TableHead>
                    <TableHead className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="group border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => handleViewUser(user.id)}
                    >
                      <TableCell className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        USR-{user.id.toString().padStart(6, '0')}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                         <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">{user.fullName || 'Name Not Provided'}</span>
                            <span className="text-[11px] text-slate-500">{user.mobile || '—'}</span>
                         </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                         <span className="text-xs text-slate-600">
                            {user.profile?.personal_email || user.email || '—'}
                          </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">{getStatusBadge(user.status)}</TableCell>
                      
                      <TableCell className="px-4 py-3 text-right pr-4">
                          <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 rounded-lg text-[10px] uppercase tracking-wide"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewUser(user.id);
                              }}
                          >
                              <Eye className="h-3 w-3 mr-1.5" /> View
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <UserDetailSheet 
        userId={selectedUserId}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}