import { useState, useEffect } from 'react';
import { documentsAPI } from '@/lib/api';
import { useDirectUpload, UPLOAD_FOLDERS } from '@/hooks/useDirectUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FieldWrapper } from '@/components/ui/FieldWrapper';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import MainLayout from '@/components/layouts/MainLayout';
import { FileUp, CheckCircle2, Upload, FileText, Home, Users, Banknote, ShieldCheck, Download, ExternalLink, Loader2 } from 'lucide-react';
import {
  downloadAllApplicationDocuments,
  errorMessageFromBlobResponse,
} from '@/utils/downloadAllDocuments';

export default function Documents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vaultData, setVaultData] = useState([]);
  const [downloadingAppId, setDownloadingAppId] = useState(null);

  useEffect(() => {
    fetchVault();
  }, []);

  const fetchVault = async () => {
    setLoading(true);
    try {
      const response = await documentsAPI.getDocumentVault();
      if (response.status === 1) {
        setVaultData(response.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async (vaultItem) => {
    const appRef = vaultItem.applicationId;
    if (!appRef) return;
    setDownloadingAppId(appRef);
    setError('');
    try {
      await downloadAllApplicationDocuments(
        appRef,
        vaultItem.applicationNumber || vaultItem.leadId || appRef
      );
    } catch (err) {
      const message = await errorMessageFromBlobResponse(err, 'Failed to download all documents');
      setError(message);
    } finally {
      setDownloadingAppId(null);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="mb-12 text-center">
           <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-lg mb-4 border border-indigo-100 shadow-sm">
             <ShieldCheck className="w-8 h-8 text-indigo-600" />
           </div>
           <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
             My Loan Documents
           </h1>
           <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
             Securely view and download your verified loan agreements and sanction letters.
           </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-8 rounded-lg border-rose-100 bg-rose-50 text-rose-900 p-4">
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Spinner className="h-10 w-10 text-indigo-600" />
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black animate-pulse">Syncing Secure Vault...</p>
            </div>
          ) : vaultData.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-100 bg-slate-50/30 rounded-lg overflow-hidden">
               <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-sm mb-6">
                    <FileText className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">No documents generated yet</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    Your signed sanction letter will appear here once your application is approved and signed.
                  </p>
               </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {vaultData.map((vaultItem) => (
                <div key={vaultItem.applicationId} className="group space-y-3">
                  <div className="flex items-center justify-end px-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDownloadAll(vaultItem)}
                      disabled={downloadingAppId === vaultItem.applicationId}
                      className="h-10 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                    >
                      {downloadingAppId === vaultItem.applicationId ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {downloadingAppId === vaultItem.applicationId ? 'Preparing ZIP…' : 'Download All'}
                    </Button>
                  </div>
                  {vaultItem.documents.map((doc, index) => (
                    <Card 
                      key={`${vaultItem.applicationId}-${index}`}
                      className="relative overflow-hidden border border-slate-100 bg-white rounded-lg hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group"
                    >
                      <CardContent className="p-8">
                         <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                               <div className="relative">
                                  <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                                    <FileText className="w-8 h-8 text-white" />
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                  </div>
                               </div>
                               <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-xl font-black text-slate-900 tracking-tight">{doc.name}</h4>
                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md">Verified</Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                                    {(vaultItem.loanAccountNumber || vaultItem.leadId) && (
                                      <span className="flex items-center gap-1.5 uppercase tracking-widest text-[9px] font-black font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                        {[
                                          vaultItem.leadId && `Lead ${vaultItem.leadId}`,
                                          vaultItem.loanAccountNumber && `LAN ${vaultItem.loanAccountNumber}`,
                                        ]
                                          .filter(Boolean)
                                          .join(' · ')}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1.5 uppercase tracking-widest text-[9px] font-black">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                      {new Date(doc.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto">
                              <Button
                                onClick={() => {
                                  const downloadUrl = documentsAPI.getDownloadUrl(
                                    doc.type,
                                    vaultItem.applicationNumber,
                                    doc.url
                                  );
                                  window.open(downloadUrl, '_blank');
                                }}
                                className="flex-1 md:flex-none h-14 px-8 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-2.5"
                              >
                                <Download className="w-4 h-4" />
                                Download PDF
                              </Button>
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-14 h-14 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-white transition-all shadow-sm group/btn"
                              >
                                <ExternalLink className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                              </a>
                            </div>
                         </div>
                      </CardContent>
                      
                      {/* Aesthetic highlight */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 p-8 bg-slate-50/50 rounded-lg border border-slate-100 flex flex-col md:flex-row items-center gap-6">
           <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
             <ShieldCheck className="w-7 h-7 text-indigo-600" />
           </div>
           <div className="flex-1 text-center md:text-left">
             <h4 className="text-sm font-bold text-slate-900 mb-1">Digital Security Guarantee</h4>
             <p className="text-xs text-slate-500 leading-relaxed">
               All documents are legally binding and protected by end-to-end encryption. Digital signatures are verified against government-authorized repositories.
             </p>
           </div>
        </div>
      </div>
    </MainLayout>
  );
}
