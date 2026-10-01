
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    ShieldBan, Search, Plus, Trash2, UserX,
    RefreshCw, CreditCard, Phone, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { adminAPI } from '@/lib/api';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { adminUi } from '@/config/adminUiTokens';

const SEARCH_DEBOUNCE_MS = 400;

function isValidBlacklistSearch(raw) {
    const q = String(raw || '').trim().toUpperCase();
    if (!q) return false;
    const digits = q.replace(/\D/g, '');
    if (digits.length === 10) return true;
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(q)) return true;
    return false;
}

export default function BlacklistManagement() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchError, setSearchError] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newEntry, setNewEntry] = useState({ pan_card: '', mobile: '', reason: '' });
    const [adding, setAdding] = useState(false);

    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const searchDebounceRef = useRef(null);

    const fetchBlacklist = useCallback(async (page = 1, queryOverride = null, forceRefresh = false) => {
        const q = queryOverride != null ? queryOverride : search;
        const trimmed = String(q || '').trim();

        // Empty = full list; non-empty must be full PAN or 10-digit mobile
        if (trimmed && !isValidBlacklistSearch(trimmed)) {
            setCustomers([]);
            setPagination((p) => ({ ...p, page: 1, total: 0 }));
            return;
        }

        setLoading(true);
        try {
            const params = { page, limit: pagination.limit };
            if (trimmed) params.search = trimmed;
            if (forceRefresh) params._t = Date.now();
            const resp = await adminAPI.getBlacklistedCustomers(params);
            if (resp.status === 1 || resp.data) {
                setCustomers(resp.data.customers || []);
                setPagination(resp.data.pagination || { page: 1, limit: 20, total: 0 });
            }
        } catch (err) {
            console.error("Failed to fetch blacklist:", err);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [search, pagination.limit]);

    useEffect(() => {
        fetchBlacklist(1, '');
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- load full list once on mount
    }, []);

    const handleSearchInputChange = (value) => {
        setSearch(value);
        setSearchError('');

        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        searchDebounceRef.current = setTimeout(() => {
            const trimmed = String(value || '').trim();
            if (!trimmed) {
                fetchBlacklist(1, '');
                return;
            }
            if (isValidBlacklistSearch(trimmed)) {
                fetchBlacklist(1, trimmed);
            }
            // Partial input: wait until PAN/mobile is complete (no API spam)
        }, SEARCH_DEBOUNCE_MS);
    };

    const handleSearch = () => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        const trimmed = String(search || '').trim();
        if (!trimmed) {
            setSearchError('');
            fetchBlacklist(1, '');
            return;
        }
        if (!isValidBlacklistSearch(trimmed)) {
            setSearchError('Enter a valid PAN (e.g. ABCDE1234F) or 10-digit mobile number.');
            return;
        }
        setSearchError('');
        fetchBlacklist(1, trimmed);
    };

    const handleAdd = async () => {
        if (!newEntry.pan_card && !newEntry.mobile) {
            alert("At least PAN card or Mobile number is required");
            return;
        }
        setAdding(true);
        try {
            const resp = await adminAPI.addBlacklistedCustomer(newEntry);
            if (resp.status === 1 || resp.data) {
                const panQ = String(newEntry.pan_card || '').trim().toUpperCase();
                const mobileQ = String(newEntry.mobile || '').replace(/\D/g, '');
                const query = isValidBlacklistSearch(panQ)
                    ? panQ
                    : isValidBlacklistSearch(mobileQ)
                        ? mobileQ
                        : '';

                setIsAddOpen(false);
                setNewEntry({ pan_card: '', mobile: '', reason: '' });
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                if (query) {
                    setSearch(query);
                    setSearchError('');
                    fetchBlacklist(1, query, true);
                } else {
                    fetchBlacklist(1, '', true);
                }
            }
        } catch (err) {
            alert(err?.message || err?.response?.data?.message || "Failed to add to blacklist");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const resp = await adminAPI.removeBlacklistedCustomer(deleteId);
            if (resp.status === 1 || resp.success) {
                setCustomers(prev => prev.filter(c => c.id !== deleteId));
                setDeleteId(null);
                const isLastItemOnPage = customers.length === 1 && pagination.page > 1;
                const pageToFetch = isLastItemOnPage ? pagination.page - 1 : pagination.page;
                const q = isValidBlacklistSearch(search) ? search : '';
                fetchBlacklist(pageToFetch, q, true);
            }
        } catch (err) {
            alert(err?.message || err?.response?.data?.message || "Failed to remove from blacklist");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={cn('text-xl font-semibold tracking-tight flex items-center gap-3', adminUi.textPrimary)}>
                        <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                            <ShieldBan className="w-5 h-5 text-red-600" />
                        </div>
                        Blacklisted customers
                    </h1>
                    <p className={cn('text-sm mt-1', adminUi.textMuted)}>
                        Search by PAN or mobile to filter. New applications with a match are rejected by the credit check / BRE.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white gap-2 h-9 px-4 text-xs">
                                <Plus className="w-4 h-4" /> Add to Blacklist
                            </Button>
                        </DialogTrigger>
                        <DialogContent className={cn('sm:max-w-md bg-white', adminUi.modal)}>
                            <DialogHeader className="space-y-1">
                                <DialogTitle className="text-base font-semibold text-slate-900">Add New Blacklist Entry</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500">
                                    This customer will be automatically rejected by the credit check / BRE.
                                </DialogDescription>
                            </DialogHeader>
                            <div className={adminUi.modalBody}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">PAN Card</label>
                                    <Input
                                        placeholder="ABCDE1234F"
                                        value={newEntry.pan_card}
                                        onChange={e => setNewEntry(p => ({...p, pan_card: e.target.value.toUpperCase()}))}
                                        className="rounded-lg h-9 border-slate-200 bg-slate-50 text-sm font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">Mobile Number</label>
                                    <Input
                                        placeholder="9876543210"
                                        value={newEntry.mobile}
                                        onChange={e => setNewEntry(p => ({...p, mobile: e.target.value}))}
                                        className="rounded-lg h-9 border-slate-200 bg-slate-50 text-sm font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">Reason for Blacklisting</label>
                                    <Textarea
                                        placeholder="Fraud attempt, fake income documents, etc."
                                        value={newEntry.reason}
                                        onChange={e => setNewEntry(p => ({...p, reason: e.target.value}))}
                                        className="rounded-lg min-h-[72px] border-slate-200 bg-slate-50 text-sm p-3 resize-none"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-lg text-slate-500 text-xs h-9">Cancel</Button>
                                <Button
                                    onClick={handleAdd}
                                    disabled={adding || (!newEntry.pan_card && !newEntry.mobile)}
                                    className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs px-5 h-9"
                                >
                                    {adding ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ShieldBan className="w-4 h-4 mr-2" />}
                                    Add to Blacklist
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className={cn(adminUi.surface, 'p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-sm')}>
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by PAN or mobile number…"
                        className="pl-10 h-10 rounded-lg border-slate-200 bg-white text-sm"
                        value={search}
                        onChange={e => handleSearchInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSearch();
                        }}
                    />
                </div>
                <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={loading}
                    className="h-10 px-4 gap-2 text-xs bg-slate-900 text-white hover:bg-slate-800"
                >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search
                </Button>
            </div>
            {searchError && (
                <p className="text-xs text-rose-600 px-1">{searchError}</p>
            )}

            <div className="overflow-hidden">
                <Table>
                    <TableHeader className={adminUi.tableHeader}>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide px-4 py-2.5">Customer Detail</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide px-4 py-2.5">Blacklist Reason</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide px-4 py-2.5">Blacklisted By</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide px-4 py-2.5">Date Added</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-right px-4 py-2.5">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <TableRow key={i} className="animate-pulse">
                                    <TableCell colSpan={5} className="h-12 px-4">
                                        <div className="h-4 bg-slate-100 rounded-md w-full" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                                        <UserX className="w-12 h-12 text-slate-300" />
                                        <p className="text-sm font-medium text-slate-500">
                                            {search.trim()
                                                ? 'No blacklist match for this PAN or mobile'
                                                : 'No blacklisted customers yet'}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((c) => (
                                <TableRow key={c.id} className="group hover:bg-slate-50 border-slate-200 transition-colors">
                                    <TableCell className="px-4 py-3">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 rounded-lg">
                                                    <CreditCard className="w-3 h-3 text-slate-600" />
                                                </div>
                                                <span className="text-xs font-mono font-medium text-slate-700">{c.pan_card || 'NO PAN'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-emerald-50 rounded-lg">
                                                    <Phone className="w-3 h-3 text-emerald-500" />
                                                </div>
                                                <span className="text-xs font-mono text-slate-500">{c.mobile || 'NO MOBILE'}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-xs">
                                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic">
                                                &quot;{c.reason || 'No reason provided'}&quot;
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white">
                                                {c.blacklisted_by_name?.charAt(0) || 'A'}
                                            </div>
                                            <span className="text-[11px] font-medium text-slate-600">{c.blacklisted_by_name || 'System Admin'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            <span className="text-[11px] font-normal">
                                                {c.blacklisted_at ? format(new Date(c.blacklisted_at), 'MMM dd, yyyy') : 'N/A'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-4 py-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-lg h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                                            onClick={() => setDeleteId(c.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {customers.length > 0 && (
                    <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                            Showing {customers.length} of {pagination.total} entries
                        </p>
                        <div className="flex items-center gap-2">
                             <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg h-8 border-slate-100 text-[10px] font-medium"
                                disabled={pagination.page <= 1}
                                onClick={() => fetchBlacklist(pagination.page - 1, isValidBlacklistSearch(search) ? search : '')}
                             >
                                Previous
                             </Button>
                             <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg h-8 border-slate-100 text-[10px] font-medium"
                                disabled={pagination.page * pagination.limit >= pagination.total}
                                onClick={() => fetchBlacklist(pagination.page + 1, isValidBlacklistSearch(search) ? search : '')}
                             >
                                Next
                             </Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className={cn('sm:max-w-xs bg-white', adminUi.modal)}>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-4 bg-red-50 rounded-full">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Remove from Blacklist?</h3>
                            <p className="text-xs text-slate-500 mt-2">
                                This customer will be allowed to apply for loans again. This action is tracked.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="mt-4 flex-col-reverse sm:flex-row gap-2">
                        <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1 rounded-lg text-slate-500 text-xs h-9">Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs h-9"
                            disabled={deleting}
                        >
                            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Yes, Remove"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
