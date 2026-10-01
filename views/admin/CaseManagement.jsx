import React, { useState, useMemo ,useEffect } from 'react';
import { adminAPI } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import {
  Headset, Plus, AlertCircle, Clock, X, Filter,
  MessageSquare, CheckCircle2, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearch } from '@/hooks/useSearch';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/spinner';

// Priority config
const PRIORITY_CONFIG = {
  critical: { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  medium: { color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  low: { color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const STATUS_CONFIG = {
  open: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-blue-100 text-blue-700',
  escalated: 'bg-red-100 text-red-700',
  resolved: 'bg-slate-100 text-slate-600',
};

const CATEGORIES = [
  'document_issue', 'payment_issue', 'technical', 'complaint', 'general_inquiry'
];

export default function CaseManagement() {
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [createForm, setCreateForm] = useState({
    category: '', subject: '', description: '', priority: 'medium',
    loanApplicationId: '', userId: ''
  });
  const [creating, setCreating] = useState(false);

  const {
    results,
    loading,
    searchTerm: search,
    setSearchTerm: setSearch,
    refresh: fetchCases
  } = useSearch(
    (query, signal) => {
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (query) params.search = query;
        return adminAPI.getCases(params, { signal });
    },
    { delay: 500, useCache: true, dependencies: [filters] }
  );

  const cases = results?.cases || [];


  useEffect(() => {
    adminAPI.getAdmins().then(res => {
      // The backend returns { success, message, data: { admins: [...] } }
      // apiClient un-wraps once, so res is the main object.
      if (res?.data?.admins) {
        setAdmins(res.data.admins);
      } else if (res?.admins) {
        setAdmins(res.admins);
      }
    }).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!createForm.subject || !createForm.category) return;
    setCreating(true);
    try {
      const res = await adminAPI.createCase(createForm);
      if (res?.success) {
        setShowCreateModal(false);
        setCreateForm({ category: '', subject: '', description: '', priority: 'medium', loanApplicationId: '', userId: '' });
        fetchCases();
      }
    } catch (err) {
      console.error('Create case error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async (caseId, adminId) => {
    try {
      await adminAPI.assignCase(caseId, { assignedToAdmin: adminId });
      fetchCases();
    } catch (err) {
      console.error('Assign error:', err);
    }
  };

  const handleResolve = async (caseId) => {
    try {
      await adminAPI.resolveCase(caseId, { resolutionNotes: 'Resolved by admin' });
      fetchCases();
    } catch (err) {
      console.error('Resolve error:', err);
    }
  };

  const openComments = async (caseItem) => {
    setShowCommentsDrawer(caseItem);
    try {
      const res = await adminAPI.getCaseComments(caseItem.id);
      if (res?.success) setComments(res.comments);
    } catch (err) {
      setComments([]);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !showCommentsDrawer) return;
    setCommenting(true);
    try {
      await adminAPI.addCaseComment(showCommentsDrawer.id, { commentText: newComment });
      setNewComment('');
      const res = await adminAPI.getCaseComments(showCommentsDrawer.id);
      if (res?.success) setComments(res.comments);
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setCommenting(false);
    }
  };

  const isSlaBreached = (slaDate, status) => {
    if (!slaDate || status === 'resolved') return false;
    return new Date(slaDate) < new Date();
  };

  const getSlaTimeLeft = (slaDate) => {
    if (!slaDate) return '';
    const diff = new Date(slaDate) - new Date();
    if (diff <= 0) return 'Breached';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h ${mins}m`;
  };

  const stats = {
    total: cases.length,
    open: cases.filter(c => c.status === 'open').length,
    inProgress: cases.filter(c => c.status === 'in_progress').length,
    escalated: cases.filter(c => c.status === 'escalated').length,
    resolved: cases.filter(c => c.status === 'resolved').length,
    breached: cases.filter(c => isSlaBreached(c.sla_due_at, c.status)).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-lg shadow-lg shadow-blue-100">
            <Headset className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Case Management</h1>
            <p className="text-sm text-gray-500">SLA-tracked tickets, assignments & resolution workflow</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 flex items-center gap-2 shadow-lg shadow-blue-100">
          <Plus className="w-4 h-4" /> Create Ticket
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-50 border-slate-200 text-slate-900' },
          { label: 'Open', value: stats.open, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Escalated', value: stats.escalated, color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Resolved', value: stats.resolved, color: 'bg-gray-50 border-gray-200 text-gray-600' },
          { label: 'SLA Breached', value: stats.breached, color: 'bg-amber-50 border-amber-200 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-lg p-4 text-center`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest font-medium mt-1 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm overflow-x-auto">
        <Filter className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
        <SearchInput
          placeholder="Search ticket # or subject..."
          value={search}
          onChange={setSearch}
          loading={loading}
          containerClassName="w-64"
          inputClassName="h-9 text-xs"
        />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[120px]">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[120px]">
          <option value="">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-slate-500">Ticket</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-slate-500">Subject</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-slate-500">Priority</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-slate-500">SLA</th>
                  <th className="px-5 py-3.5 font-bold text-[10px] uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cases.length === 0 ? (
                  <tr><td colSpan="6" className="px-5 py-16 text-center text-slate-500 text-sm">No cases found. Create your first ticket above.</td></tr>
                ) : cases.map((c) => {
                  const breached = isSlaBreached(c.sla_due_at, c.status);
                  const pri = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-blue-700">{c.ticket_number}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800 text-sm">{c.subject || 'N/A'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">{(c.category || '').replace(/_/g, ' ')}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_CONFIG[c.status] || 'bg-gray-100 text-gray-700'}`}>
                          {(c.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${pri.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />
                          {c.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {c.status === 'resolved' ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : breached ? (
                          <div className="flex items-center gap-1.5 text-red-600 font-bold text-[11px] bg-red-50 px-2.5 py-1 rounded-lg w-fit">
                            <AlertCircle className="w-3.5 h-3.5" /> Breached
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> {getSlaTimeLeft(c.sla_due_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openComments(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Comments">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {c.status !== 'resolved' && (
                            <>
                              <select onChange={e => { if (e.target.value) handleAssign(c.id, e.target.value); e.target.value = ''; }} className="text-[10px] border rounded-lg px-1.5 py-1 bg-slate-50 w-20" defaultValue="">
                                <option value="" disabled>Assign</option>
                                {admins.map(a => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
                              </select>
                              <button onClick={() => handleResolve(c.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Resolve">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-0 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Create Support Ticket</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1.5">Category *</label>
                  <select value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none bg-slate-50">
                    <option value="">Select...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1.5">Priority</label>
                  <select value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none bg-slate-50">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1.5">Subject *</label>
                <input value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none bg-slate-50" placeholder="Brief summary of the issue" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1.5">Description</label>
                <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none bg-slate-50 resize-none" placeholder="Detailed description..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1.5">Loan App ID (Optional)</label>
                  <input value={createForm.loanApplicationId} onChange={e => setCreateForm(f => ({ ...f, loanApplicationId: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none bg-slate-50" placeholder="e.g. 123" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1.5">User ID (Optional)</label>
                  <input value={createForm.userId} onChange={e => setCreateForm(f => ({ ...f, userId: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none bg-slate-50" placeholder="e.g. 456" />
                </div>
              </div>
            </div>
            <div className="p-6 pt-2 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-lg">Cancel</Button>
              <Button disabled={creating || !createForm.subject || !createForm.category} onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6">
                {creating ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Drawer */}
      {showCommentsDrawer && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowCommentsDrawer(null)}>
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{showCommentsDrawer.ticket_number}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{showCommentsDrawer.subject}</p>
              </div>
              <button onClick={() => setShowCommentsDrawer(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">No comments yet.</p>
              ) : comments.map((cm, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{cm.admin_name || 'System'}</span>
                    <span className="text-[10px] text-slate-400">{new Date(cm.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700">{cm.comment_text}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center gap-2">
              <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} placeholder="Type a comment..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none" />
              <button disabled={commenting || !newComment.trim()} onClick={handleAddComment} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
