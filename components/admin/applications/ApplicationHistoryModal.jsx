import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Clock, History, User, MessageCircle, ArrowRightCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getStatusBadge } from '@/utils/statusUtils';
import { adminUi } from '@/config/adminUiTokens';

export default function ApplicationHistoryModal({
    isOpen,
    setIsOpen,
    historyData,
    loadingHistory
}) {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl rounded-lg p-0 border border-slate-200 shadow-lg overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
                        <History className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <DialogTitle className="text-base font-semibold text-slate-900">Application History</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 mt-0.5">
                            Complete audit trail of all actions and movements.
                        </DialogDescription>
                    </div>
                </div>

                <div className="p-4 max-h-[55vh] overflow-y-auto custom-scrollbar">
                    {loadingHistory ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <Spinner className="h-6 w-6 text-slate-900" />
                            <p className="text-[10px] uppercase tracking-wide text-slate-400">Retrieving audit logs...</p>
                        </div>
                    ) : historyData.length > 0 ? (
                        <div className="relative pl-6 space-y-3">
                            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-100" />
                            
                            {historyData.map((event, idx) => (
                                <div key={idx} className="relative group">
                                    <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-slate-800 z-10" />
                                    
                                    <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-auto bg-white text-slate-600 border-slate-200 uppercase font-medium">
                                                    {event.action_type || 'UPDATE'}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(event.createdAt || event.created_at).toLocaleString('en-IN', { 
                                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-100 text-[10px] text-slate-600">
                                                <User className="h-3 w-3 text-slate-400" />
                                                {event.admin_name || 'System Admin'}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 py-1.5 border-y border-dashed border-slate-100">
                                            <span className="text-[9px] text-slate-400 uppercase">Status:</span>
                                            <div className="scale-90 origin-left">{getStatusBadge(event.previous_status || 'Draft')}</div>
                                            <ArrowRightCircle className="h-3 w-3 text-slate-300" />
                                            <div className="scale-90 origin-left">{getStatusBadge(event.new_status || event.status || 'Draft')}</div>
                                        </div>

                                        {(event.remarks || event.reason || event.admin_remarks) && (
                                            <div className="flex items-start gap-2 bg-white p-2 rounded-md border border-slate-100">
                                                <MessageCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    "{event.remarks || event.reason || event.admin_remarks}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <p className="text-xs text-slate-400">No history available for this application.</p>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-right">
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="h-9 px-4 rounded-lg border-slate-200 text-xs">Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
