import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router';
import { loanAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getStatusBadge } from '@/utils/statusUtils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import MainLayout from '@/components/layouts/MainLayout';
import { FileText, Eye, Clock, CheckCircle2, XCircle, Search, Calendar, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import UserApplicationDetailSheet from '@/components/loans/UserApplicationDetailSheet';

export default function LoanApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAppId, setSelectedAppId] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [pagination.page]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await loanAPI.getApplications({
        page: pagination.page,
        limit: pagination.limit,
      });
      if (response.status === 1) {
        setApplications(response.data.applications || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination?.total ?? response.data.total ?? 0,
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const normalizedStatus = status.toLowerCase().trim();
    
    const config = {
      draft: { variant: 'secondary', label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      submitted: { variant: 'outline', label: 'Submitted', className: 'border-blue-200 text-blue-700 bg-blue-50' },
      under_review: { variant: 'default', icon: <Clock className="h-3.5 w-3.5 mr-1" />, label: 'Under Review', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
      approved: { variant: 'default', icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />, label: 'Approved', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200' },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3.5 w-3.5 mr-1 text-rose-600" />, label: 'Rejected', className: 'bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200' },
      offer_sent: { variant: 'default', icon: <Clock className="h-3.5 w-3.5 mr-1 text-cyan-600" />, label: 'Offer Sent', className: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100 border-cyan-200' },
      offer_accepted: { variant: 'default', icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-teal-600" />, label: 'Offer Accepted', className: 'bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200' },
      offer_rejected: { variant: 'destructive', icon: <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" />, label: 'Offer Rejected', className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200' },
      video_declaration_pending: { variant: 'outline', icon: <Clock className="h-3.5 w-3.5 mr-1 text-orange-600" />, label: 'Video Pending', className: 'bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-100' },
      video_declaration_submitted: { variant: 'default', icon: <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" />, label: 'Video Submitted', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200' },
      video_declaration_rejected: { variant: 'destructive', icon: <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" />, label: 'Video Rejected', className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200' },
      esign_completed: { variant: 'default', icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />, label: 'E-Sign Done', className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100' },
      disbursed: { variant: 'default', icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />, label: 'Disbursed', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
      closed: { variant: 'secondary', label: 'Closed', className: 'bg-gray-200 text-gray-800' },
      defaulted: { variant: 'destructive', label: 'Defaulted', className: 'bg-red-900 text-white' },
    };

    // Fallback logic for unknown statuses to ensure Capitalization
    const formatLabel = (str) => str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    const item = config[normalizedStatus] || { 
      variant: 'secondary', 
      label: formatLabel(normalizedStatus),
      className: 'bg-gray-100 text-gray-600'
    };

    return (
      <Badge variant={item.variant} className={`flex items-center gap-1 px-3 py-1 w-fit border-0 font-semibold text-[11px] uppercase tracking-wider rounded-md shadow-sm ${item.className || ''}`}>
        {item.icon}
        {item.label}
      </Badge>
    );
  };

  // Filter applications by search term (Lead / LAN / internal id)
  const filteredApplications = applications.filter(app => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      app.lead_id?.toLowerCase().includes(q) ||
      app.loan_account_number?.toLowerCase().includes(q) ||
      app.application_number?.toLowerCase().includes(q) ||
      app.lead_id?.toLowerCase().includes(q) ||
      app.loan_account_number?.toLowerCase().includes(q) ||
      app.id.toString().includes(searchTerm)
    );
  });

  const openSheet = (id) => {
    setSelectedAppId(id);
    setIsSheetOpen(true);
  };

  return (
    <MainLayout>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              My Loans
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-500">
              Track and manage all your loan applications history
            </p>
          </div>
          <Button 
            onClick={() => navigate('/loan/eligibility')} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
          >
            New Application
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-200 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-xl font-bold text-gray-900">Application History</CardTitle>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search by ID..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Spinner className="w-10 h-10 text-blue-600" />
                <p className="text-gray-500 animate-pulse">Loading applications...</p>
              </div>
            ) : error ? (
              <div className="p-6">
                 <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                 </Alert>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No applications found</h3>
                <p className="text-sm text-gray-500 max-w-sm mt-1">
                  {searchTerm ? 'Try adjusting your search terms' : 'You haven\'t submitted any loan applications yet'}
                </p>
                {!searchTerm && (
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/loan/eligibility')}>
                    Apply Now
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-white">
                      <TableRow>
                        <TableHead className="w-[160px] pl-6">Account / Lead</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => (
                        <TableRow 
                          key={app.id} 
                          className="group hover:bg-slate-50 transition-all duration-200 cursor-pointer border-b border-slate-200"
                          onClick={() => openSheet(app.id)}
                        >
                          <TableCell className="font-medium pl-6 text-slate-600">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {app.loan_account_number || app.lead_id || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            ₹{(app.approved_amount || app.principal_amount || app.principalAmount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {app.tenure_days || app.tenureDays} days
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(app.application_status || app.status, app.mandate_status)}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                             <div className="flex items-center gap-1.5">
                               <Calendar className="w-3.5 h-3.5" />
                               {new Date(app.created_at || app.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                               })}
                             </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white hover:bg-indigo-600 hover:text-white border-indigo-100 text-indigo-600 transition-all duration-300 font-bold shadow-sm group-hover:shadow-md h-9 px-4 rounded-lg flex items-center gap-2 ml-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSheet(app.id);
                              }}
                            >
                              View Details
                              <Eye className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {pagination.total > pagination.limit && (
                  <div className="border-t border-gray-100 p-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: Math.max(1, prev.page - 1),
                              }))
                            }
                            className={pagination.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => i + 1)
                          .slice(Math.max(0, pagination.page - 2), pagination.page + 3)
                          .map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setPagination((prev) => ({ ...prev, page }))}
                                isActive={page === pagination.page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: Math.min(
                                  Math.ceil(pagination.total / pagination.limit),
                                  prev.page + 1
                                ),
                              }))
                            }
                            className={
                              pagination.page >= Math.ceil(pagination.total / pagination.limit)
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* User Application Detail Sheet */}
        <UserApplicationDetailSheet 
          applicationId={selectedAppId} 
          isOpen={isSheetOpen} 
          onClose={() => setIsSheetOpen(false)} 
        />
    </MainLayout>
  );
}
