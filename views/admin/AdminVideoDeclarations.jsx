import { useState, useMemo,useCallback } from 'react';
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
import { Video, RefreshCw, Eye, Phone, CalendarDays } from 'lucide-react';
import ApplicationDetailSheet from '@/components/admin/ApplicationDetailSheet.jsx';
import { useSearch } from '@/hooks/useSearch';
import { SearchInput } from '@/components/ui/SearchInput';
import { PageLoader } from '@/components/ui/PageLoader';

function StatusBadge({ status }) {
  const styles = {
    submitted: 'bg-amber-100 text-amber-900',
    verified: 'bg-emerald-100 text-emerald-900',
    rejected: 'bg-rose-100 text-rose-900',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status || 'unknown'}
    </span>
  );
}

export default function AdminVideoDeclarations() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('latest');
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [showApplicationSheet, setShowApplicationSheet] = useState(false);

  const fetchFn = useCallback((query, signal) => {
      return adminAPI.getVideoDeclarations({
          status: statusFilter === 'all' ? 'all' : statusFilter,
          search: query || '',
          limit: 100,
      }, { signal });
  }, [statusFilter]);

  const {
    results,
    loading,
    error,
    searchTerm: search,
    setSearchTerm: setSearch,
    refresh
  } = useSearch(fetchFn, { delay: 500, useCache: true, dependencies: [statusFilter] });

  const declarations = results?.data?.declarations || [];
  const summary = results?.data?.summary || { total: 0, submitted: 0, verified: 0, rejected: 0 };

  const sortedDeclarations = useMemo(() => {
    let next = [...declarations];

    next.sort((a, b) => {
      if (sortMode === 'name_asc') {
        return String(a.full_name || '').localeCompare(String(b.full_name || ''));
      }
      if (sortMode === 'name_desc') {
        return String(b.full_name || '').localeCompare(String(a.full_name || ''));
      }
      if (sortMode === 'latest') {
        return new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0);
      }
      return new Date(a.uploaded_at || 0) - new Date(b.uploaded_at || 0);
    });

    return next;
  }, [declarations, sortMode]);


  const openApplicationSheet = (applicationId) => {
    setSelectedApplicationId(applicationId);
    setShowApplicationSheet(true);
  };

  return (
    <>
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="rounded-lg border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_30%),linear-gradient(135deg,#ffffff_0%,#fffaf0_40%,#f8fafc_100%)] p-4 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-slate-950 p-3 text-white">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Video Declaration Desk</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Customer video declarations</div>
                <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Review all customer video declarations in one place. This list is arranged for operations teams and can be sorted A to Z by customer name.
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Total Records</div>
            {loading && !results ? (
              <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-md mt-2"></div>
            ) : (
              <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.total}</div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Submitted</div>
            {loading && !results ? (
              <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-md mt-2"></div>
            ) : (
              <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.submitted}</div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Verified</div>
            {loading && !results ? (
              <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-md mt-2"></div>
            ) : (
              <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.verified}</div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Rejected</div>
            {loading && !results ? (
              <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-md mt-2"></div>
            ) : (
              <div className="mt-2 text-2xl font-semibold text-slate-950">{summary.rejected}</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_200px_220px]">
            <div className="relative">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by customer name, mobile, email, or application number"
                loading={loading}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="name_asc">Name A to Z</option>
              <option value="name_desc">Name Z to A</option>
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden">
          {loading ? (
            <PageLoader text="Loading video declarations..." minHeight="min-h-[320px]" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Video</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDeclarations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-slate-500">
                      No video declarations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDeclarations.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="font-medium text-slate-950">{item.full_name || 'Unknown customer'}</div>
                        <div className="text-xs text-slate-500">{item.personal_email || item.email || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {item.mobile || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{item.application_number || '-'}</div>
                        <div className="text-xs text-slate-500">{item.application_status || '-'}</div>
                      </TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {item.video_url && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-700 bg-blue-50/50"
                              onClick={() => window.open(item.video_url, '_blank')}
                            >
                              <Video className="mr-2 h-4 w-4" />
                              Watch
                            </Button>
                          )}
                          
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ApplicationDetailSheet
        applicationId={selectedApplicationId}
        isOpen={showApplicationSheet}
        onClose={() => {
          setShowApplicationSheet(false);
          setSelectedApplicationId(null);
        }}
        onUpdate={refresh}
      />
    </>
  );
}
