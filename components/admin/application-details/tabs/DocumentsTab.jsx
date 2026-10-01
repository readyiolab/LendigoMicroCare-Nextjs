import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApplicationContext } from '@/components/admin/application-details/context/ApplicationContext';
import { DataTable, DataCell, EMPTY, btnPrimary, btnSecondary } from '../common/DetailTable';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';

function formatDocDate(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function inferFormatFromUrl(url, fallback = 'application/pdf') {
  if (!url) return fallback;
  const u = url.toLowerCase();
  if (u.match(/\.(jpg|jpeg)(\?|$)/) || u.includes('/image/upload/')) return 'image/jpeg';
  if (u.match(/\.png(\?|$)/)) return 'image/png';
  if (u.match(/\.webp(\?|$)/)) return 'image/webp';
  if (u.match(/\.pdf(\?|$)/) || (u.includes('/raw/upload/') && u.includes('.pdf'))) return 'application/pdf';
  if (u.includes('/video/upload/')) return 'video/mp4';
  return fallback;
}

function UploadTrigger({ label, uploading, disabled, accept, onFile, multiple = true }) {
  return (
    <div className="relative inline-flex">
      <Button type="button" size="sm" className={btnSecondary} disabled={uploading || disabled}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
        {uploading ? 'Uploading…' : label}
      </Button>
      <input
        type="file"
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        title={`Upload ${label}`}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach((file) => onFile(file));
          e.target.value = '';
        }}
        accept={accept}
        disabled={uploading || disabled}
      />
    </div>
  );
}

function ViewBtn({ onClick, disabled }) {
  return (
    <Button size="sm" className={btnPrimary} onClick={onClick} disabled={disabled}>
      <Eye className="w-3.5 h-3.5 mr-1" />
      View
    </Button>
  );
}

function CarriedBadge({ doc, dateField = 'created_at' }) {
  if (!doc?.carried_from_lead_id) return null;
  const uploaded = formatDocDate(doc[dateField] || doc.created_at);
  return (
    <span
      className="ml-2 inline-flex items-center rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
      title="Reused from the customer's previous loan application"
    >
      Carried from {doc.carried_from_lead_id}
      {uploaded !== EMPTY ? `, uploaded ${uploaded}` : ''}
    </span>
  );
}

function StatusText({ ok, missingLabel = 'Missing', okLabel = 'Available' }) {
  return (
    <span className={cn('text-[12px] font-bold', ok ? 'text-emerald-700' : 'text-amber-700')}>
      {ok ? okLabel : missingLabel}
    </span>
  );
}

const DOC_COLS = [
  { key: 'doc', label: 'Document' },
  { key: 'detail', label: 'Detail' },
  { key: 'status', label: 'Status' },
  { key: 'remark', label: 'Remark' },
  { key: 'action', label: 'Action', className: 'text-right' },
];

export default function DocumentsTab() {
  const {
    data,
    loanApp,
    selfie,
    residenceProofs,
    bankStatements,
    uploadingKey,
    updating,
    isReadOnly,
    downloadingDoc,
    handleViewFile,
    handleDownloadAll,
    handleSalarySlipUpload,
    handleBankStatementUpload,
    handleUpdateBankStatementPassword,
    handleResidenceProofUpload,
    handleVideoDeclarationUpload,
    handleOtherDocumentUpload,
    handleDeleteOtherDocument,
    handleRenameOtherDocument,
    handleUpsertDocumentRemark,
    handleDeleteDocumentRemark,
    fetchDocumentsSection,
  } = useApplicationContext();

  const docsLoaded = Boolean(data?.sectionsLoaded?.documents);
  const documentsRefreshing = Boolean(data?.documentsRefreshing);
  const documentsLoading = Boolean(data?.documentsLoading);
  const documentsError = data?.documentsError || null;
  const initialDocumentsLoad = !docsLoaded && !documentsError && (documentsLoading || documentsRefreshing);
  const documentsIdleUnload = !docsLoaded && !documentsError && !documentsLoading && !documentsRefreshing;
  const documentsEmptyMessage = initialDocumentsLoad
    ? 'Loading…'
    : documentsIdleUnload
      ? 'Failed to load — click Refresh'
      : null;
  const downloadingAll = downloadingDoc === 'download_all';

  useEffect(() => {
    if (!docsLoaded && !documentsLoading && !documentsRefreshing) {
      fetchDocumentsSection?.(false);
    }
  }, [docsLoaded, documentsLoading, documentsRefreshing, fetchDocumentsSection]);

  const appNumber = loanApp?.application_number;
  const selfieUrl = selfie?.selfie_display_url || selfie?.display_url || selfie?.selfie_url || selfie?.url;
  const videoUrl = data?.videoDeclaration?.video_url || loanApp?.video_declaration_url;
  const canUploadVideo = !isReadOnly;
  const pan = data?.profile?.pancard;
  const salarySlips = data?.salarySlips || [];
  const esignDocs = data?.esignDocs || data?.esignDocuments || [];
  const otherDocuments = data?.otherDocuments || [];
  const documentRemarks = data?.documentRemarks || [];
  const uploadedProofs = residenceProofs || [];
  const aadhaarFront = uploadedProofs.find((doc) => doc.document_type === 'aadhaar_front');
  const aadhaarBack = uploadedProofs.find((doc) => doc.document_type === 'aadhaar_back');
  const panDocument = uploadedProofs.find((doc) => doc.document_type === 'pan_front');
  const panUrl = panDocument?.document_url || data?.profile?.pancard_url;
  const addressProofs = uploadedProofs.filter(
    (doc) => !['aadhaar_front', 'aadhaar_back', 'pan_front', 'pan_card'].includes(doc.document_type)
  );

  const hasDownloadableDocs = useMemo(() => {
    const bankUrls = (bankStatements || []).some((d) => d.statement_url);
    const salaryUrls = salarySlips.some((d) => d.file_url || d.document_url);
    const residenceUrls = (residenceProofs || []).some((d) => d.document_url);
    const otherUrls = otherDocuments.some((d) => d.document_url);
    const esignUrls = (data?.esignDocs || data?.esignDocuments || []).some(
      (d) => d.signed_document_url || d.document_url
    );
    return Boolean(
      selfieUrl ||
        videoUrl ||
        panUrl ||
        bankUrls ||
        salaryUrls ||
        residenceUrls ||
        otherUrls ||
        esignUrls
    );
  }, [
    bankStatements,
    salarySlips,
    residenceProofs,
    otherDocuments,
    data?.esignDocs,
    data?.esignDocuments,
    selfieUrl,
    videoUrl,
    panUrl,
  ]);

  const remarksByKey = useMemo(() => {
    const map = {};
    (documentRemarks || []).forEach((r) => {
      map[`${r.document_category}:${r.document_id}`] = r;
    });
    return map;
  }, [documentRemarks]);

  const [remarkDialog, setRemarkDialog] = useState({
    open: false,
    category: '',
    documentId: null,
    remarkId: null,
    text: '',
  });
  const [bankPwdDialog, setBankPwdDialog] = useState({ open: false, file: null, password: '' });
  const [editPwdDialog, setEditPwdDialog] = useState({ open: false, statementId: null, password: '' });
  const [uploadHint, setUploadHint] = useState('');
  const [renameDialog, setRenameDialog] = useState({ open: false, id: null, label: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, label: '' });

  const openRemark = (category, documentId) => {
    const existing = remarksByKey[`${category}:${documentId}`];
    setRemarkDialog({
      open: true,
      category,
      documentId,
      remarkId: existing?.id || null,
      text: existing?.remark || '',
    });
  };

  const saveRemark = async () => {
    const ok = await handleUpsertDocumentRemark({
      documentCategory: remarkDialog.category,
      documentId: remarkDialog.documentId,
      remark: remarkDialog.text,
      remarkId: remarkDialog.remarkId,
    });
    if (ok) setRemarkDialog({ open: false, category: '', documentId: null, remarkId: null, text: '' });
  };

  const RemarkCell = ({ category, documentId }) => {
    const existing = remarksByKey[`${category}:${documentId}`];
    return (
      <div className="flex flex-col gap-1 max-w-[220px]">
        {existing?.remark ? (
          <p className="text-[11px] text-slate-700 line-clamp-2">{existing.remark}</p>
        ) : (
          <span className="text-[11px] text-slate-400">No remark</span>
        )}
        {!isReadOnly && documentId ? (
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2"
              onClick={() => openRemark(category, documentId)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              {existing ? 'Edit' : 'Add remark'}
            </Button>
            {existing?.id ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px] px-2 text-rose-700 border-rose-200"
                disabled={updating}
                onClick={() => handleDeleteDocumentRemark(existing.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const queueUpload = async (label, runner) => {
    setUploadHint(label);
    try {
      await runner();
    } finally {
      setUploadHint('');
    }
  };

  return (
    <div className="space-y-3">
      {initialDocumentsLoad && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Loading documents…
        </div>
      )}
      {documentsIdleUnload && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Documents did not finish loading. Click Refresh Documents to retry.
        </div>
      )}
      {documentsError && !initialDocumentsLoad && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {documentsError}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-[10px] font-bold uppercase tracking-wide"
          disabled={
            downloadingAll ||
            documentsRefreshing ||
            initialDocumentsLoad ||
            !loanApp?.id
          }
          onClick={async () => {
            try {
              const response = await adminAPI.getLoanDocument(loanApp.id, 'sanction-letter');
              const payload = response?.data ?? response;
              const blob = payload instanceof Blob ? payload : new Blob([payload], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              window.open(url, '_blank', 'noopener,noreferrer');
              setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
            } catch (err) {
              console.error('Sanction letter open failed:', err);
            }
          }}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          Sanction letter
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-[10px] font-bold uppercase tracking-wide"
          disabled={
            downloadingAll ||
            documentsRefreshing ||
            initialDocumentsLoad ||
            !hasDownloadableDocs
          }
          onClick={() => handleDownloadAll?.()}
        >
          {downloadingAll ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1.5" />
          )}
          {downloadingAll ? 'Preparing ZIP…' : 'Download All'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-[10px] font-bold uppercase tracking-wide"
          disabled={documentsRefreshing}
          onClick={() => fetchDocumentsSection?.(true)}
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', documentsRefreshing && 'animate-spin')} />
          Refresh Documents
        </Button>
      </div>
      {(uploadingKey === 'salary' || uploadingKey === 'bank' || uploadingKey === 'residence' || uploadingKey === 'other') && (
        <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {uploadHint || `Uploading ${uploadingKey}…`}
        </div>
      )}

      <DataTable
        title="Identity & KYC"
        action={<span className="text-[11px] text-slate-500">5</span>}
        columns={DOC_COLS}
      >
        <tr>
          <DataCell>Primary selfie</DataCell>
          <DataCell>{selfieUrl ? 'Biometric captured' : 'Not uploaded'}</DataCell>
          <DataCell><StatusText ok={Boolean(selfieUrl)} /></DataCell>
          <DataCell><RemarkCell category="identity" documentId={selfie?.id || 0} /></DataCell>
          <DataCell className="text-right">
            {selfieUrl ? (
              <ViewBtn
                onClick={() =>
                  handleViewFile('selfie', selfieUrl, appNumber, selfie?.file_format || 'image/jpeg')
                }
              />
            ) : (
              EMPTY
            )}
          </DataCell>
        </tr>
        {[['Aadhaar front', aadhaarFront], ['Aadhaar back', aadhaarBack]].map(([label, doc]) => (
          <tr key={label}>
            <DataCell>{label}</DataCell>
            <DataCell mono>
              {doc ? formatDocDate(doc.created_at) : 'Not uploaded'}
              <CarriedBadge doc={doc} />
            </DataCell>
            <DataCell><StatusText ok={Boolean(doc?.document_url)} /></DataCell>
            <DataCell><RemarkCell category="residence_proof" documentId={doc?.id} /></DataCell>
            <DataCell className="text-right">
              {doc?.document_url ? (
                <ViewBtn
                  onClick={() =>
                    handleViewFile(
                      doc.document_type,
                      doc.document_url,
                      appNumber,
                      doc.file_format || inferFormatFromUrl(doc.document_url, 'image/jpeg')
                    )
                  }
                />
              ) : (
                EMPTY
              )}
            </DataCell>
          </tr>
        ))}
        <tr>
          <DataCell>Video declaration</DataCell>
          <DataCell>{videoUrl ? 'Consent recorded' : 'Pending'}</DataCell>
          <DataCell><StatusText ok={Boolean(videoUrl)} missingLabel="Pending" /></DataCell>
          <DataCell>{EMPTY}</DataCell>
          <DataCell className="text-right">
            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
              {videoUrl ? <ViewBtn onClick={() => window.open(videoUrl, '_blank')} /> : null}
              {canUploadVideo ? (
                <UploadTrigger
                  label={videoUrl ? 'Replace video' : 'Add video'}
                  uploading={uploadingKey === 'video'}
                  accept="video/mp4,video/webm,video/quicktime"
                  multiple={false}
                  onFile={(file) =>
                    queueUpload(`Uploading video: ${file.name}`, () => handleVideoDeclarationUpload(file))
                  }
                />
              ) : !videoUrl ? (
                EMPTY
              ) : null}
            </div>
          </DataCell>
        </tr>
        <tr>
          <DataCell>PAN card</DataCell>
          <DataCell mono>
            {pan || 'Not linked'}
            <CarriedBadge doc={panDocument} />
          </DataCell>
          <DataCell><StatusText ok={Boolean(panUrl)} /></DataCell>
          <DataCell><RemarkCell category="residence_proof" documentId={panDocument?.id} /></DataCell>
          <DataCell className="text-right">
            {panUrl ? (
              <ViewBtn
                onClick={() =>
                  handleViewFile(
                    'pancard',
                    panUrl,
                    appNumber,
                    panDocument?.file_format || inferFormatFromUrl(panUrl, 'image/jpeg')
                  )
                }
              />
            ) : (
              EMPTY
            )}
          </DataCell>
        </tr>
      </DataTable>

      <DataTable
        title="Employment proof"
        action={
          !isReadOnly ? (
            <UploadTrigger
              label="Add files"
              uploading={uploadingKey === 'salary'}
              accept=".pdf,.jpg,.jpeg,.png"
              onFile={(file) =>
                queueUpload(`Uploading employment proof: ${file.name}`, () =>
                  handleSalarySlipUpload(file, `slip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
                )
              }
            />
          ) : (
            <span className="text-[11px] text-slate-500">{salarySlips.length}</span>
          )
        }
        columns={DOC_COLS}
        emptyMessage={documentsEmptyMessage || 'No employment proofs uploaded'}
      >
        {initialDocumentsLoad
          ? null
          : salarySlips.length > 0
          ? salarySlips.map((slip, i) => {
              const url = slip.file_url || slip.document_url;
              return (
                <tr key={slip.id || i}>
                  <DataCell>
                    Employment proof {salarySlips.length - i}
                    {i === 0 ? <span className="ml-2 text-[11px] text-slate-500">Latest</span> : null}
                  </DataCell>
                  <DataCell mono>
                    {formatDocDate(slip.uploaded_at || slip.created_at)}
                    <CarriedBadge doc={slip} dateField="uploaded_at" />
                  </DataCell>
                  <DataCell><StatusText ok={Boolean(url)} /></DataCell>
                  <DataCell><RemarkCell category="salary_slip" documentId={slip.id} /></DataCell>
                  <DataCell className="text-right">
                    {url ? (
                      <ViewBtn
                        onClick={() =>
                          handleViewFile(
                            'salary_slip',
                            url,
                            appNumber,
                            slip.file_format || inferFormatFromUrl(url)
                          )
                        }
                      />
                    ) : (
                      EMPTY
                    )}
                  </DataCell>
                </tr>
              );
            })
          : null}
      </DataTable>

      <DataTable
        title="Bank statements"
        action={
          !isReadOnly ? (
            <UploadTrigger
              label="Add PDFs"
              uploading={uploadingKey === 'bank'}
              accept=".pdf"
              onFile={(file) => setBankPwdDialog({ open: true, file, password: '' })}
            />
          ) : (
            <span className="text-[11px] text-slate-500">{bankStatements?.length || 0}</span>
          )
        }
        columns={DOC_COLS}
        emptyMessage={documentsEmptyMessage || 'No bank statements uploaded'}
      >
        {initialDocumentsLoad
          ? null
          : bankStatements?.length > 0
          ? bankStatements.map((doc, i) => (
              <tr key={doc.id || i}>
                <DataCell>
                  Statement {bankStatements.length - i}
                  {i === 0 ? <span className="ml-2 text-[11px] text-slate-500">Latest</span> : null}
                </DataCell>
                <DataCell mono>
                  {formatDocDate(doc.created_at)}
                  <CarriedBadge doc={doc} />
                  {doc.has_password || doc.statement_password ? (
                    <span className="ml-2 text-[10px] font-semibold text-amber-700">
                      PDF password: {doc.statement_password || '••••'}
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] text-slate-400">No password</span>
                  )}
                </DataCell>
                <DataCell>
                  {doc.fetch_type === 'aa_fetch' ? (
                    String(doc.analysis_status || '').toLowerCase() === 'completed' ? (
                      <StatusText ok okLabel="Via Account Aggregator" />
                    ) : String(doc.analysis_status || '').toLowerCase() === 'failed' ? (
                      <span className="inline-flex items-center text-xs font-medium text-rose-600">
                        AA Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-amber-600">
                        AA (Consent Pending)
                      </span>
                    )
                  ) : (
                    <StatusText ok={Boolean(doc.statement_url)} okLabel="Uploaded" />
                  )}
                </DataCell>
                <DataCell><RemarkCell category="bank_statement" documentId={doc.id} /></DataCell>
                <DataCell className="text-right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    {!isReadOnly && doc.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2"
                        onClick={() =>
                          setEditPwdDialog({
                            open: true,
                            statementId: doc.id,
                            password: doc.statement_password || '',
                          })
                        }
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Password
                      </Button>
                    ) : null}
                    {doc.statement_url ? (
                      <ViewBtn
                        onClick={() =>
                          handleViewFile('bank_statement', doc.statement_url, appNumber, 'application/pdf')
                        }
                      />
                    ) : (
                      EMPTY
                    )}
                  </div>
                </DataCell>
              </tr>
            ))
          : null}
      </DataTable>

      <DataTable
        title="Address proof"
        action={
          !isReadOnly ? (
            <UploadTrigger
              label="Add files"
              uploading={uploadingKey === 'residence'}
              accept=".pdf,.jpg,.jpeg,.png"
              onFile={(file) =>
                queueUpload(`Uploading address proof: ${file.name}`, () =>
                  handleResidenceProofUpload(file, 'other')
                )
              }
            />
          ) : (
            <span className="text-[11px] text-slate-500">{addressProofs.length}</span>
          )
        }
        columns={DOC_COLS}
        emptyMessage={documentsEmptyMessage || 'No address proofs uploaded'}
      >
        {initialDocumentsLoad
          ? null
          : addressProofs.length > 0
          ? addressProofs.map((doc, i) => (
              <tr key={doc.id || i}>
                <DataCell className="capitalize">
                  {(doc.document_type || 'Residence').replace(/_/g, ' ')}
                </DataCell>
                <DataCell mono>
                  {formatDocDate(doc.created_at)}
                  <CarriedBadge doc={doc} />
                </DataCell>
                <DataCell><StatusText ok={Boolean(doc.document_url)} /></DataCell>
                <DataCell><RemarkCell category="residence_proof" documentId={doc.id} /></DataCell>
                <DataCell className="text-right">
                  {doc.document_url ? (
                    <ViewBtn
                      onClick={() =>
                        handleViewFile(
                          'residence_proof',
                          doc.document_url,
                          appNumber,
                          doc.file_format || inferFormatFromUrl(doc.document_url, 'image/jpeg')
                        )
                      }
                    />
                  ) : (
                    EMPTY
                  )}
                </DataCell>
              </tr>
            ))
          : null}
      </DataTable>

      <DataTable
        title="Loan agreement (E-Sign)"
        action={
          <span className="text-[11px] text-slate-500">
            {esignDocs.length || (['completed', 'signed'].includes(String(loanApp?.esign_status || '').toLowerCase()) ? 1 : 0)}
          </span>
        }
        columns={DOC_COLS}
        emptyMessage={
          ['completed', 'signed'].includes(String(loanApp?.esign_status || '').toLowerCase())
            ? 'Loan agreement signed'
            : (documentsEmptyMessage || 'No e-sign documents available')
        }
      >
        {initialDocumentsLoad
          ? null
          : esignDocs.length > 0
          ? esignDocs.map((doc, i) => {
              const url = doc.signed_document_url || doc.document_url;
              const isSigned = ['signed', 'completed', 'success'].includes(
                String(doc.esign_status || doc.status || '').toLowerCase()
              );
              const docName =
                doc.document_type === 'sanction_letter'
                  ? 'Sanction Letter'
                  : doc.document_type === 'combined_agreement'
                  ? 'Combined Loan Agreement'
                  : 'Loan Agreement';
              const providerLabel =
                doc.esign_provider === 'esign_direct'
                  ? 'Uploaded signed PDF'
                  : 'Digitap Aadhaar e-sign';
              return (
                <tr key={doc.id || i}>
                  <DataCell>
                    <span className="font-medium text-slate-800">{docName}</span>
                    <span className="ml-2 text-[10px] text-slate-500">({providerLabel})</span>
                  </DataCell>
                  <DataCell mono>{formatDocDate(doc.signed_at || doc.created_at)}</DataCell>
                  <DataCell>
                    <StatusText
                      ok={isSigned}
                      okLabel="Signed"
                      missingLabel={doc.esign_status || 'Pending'}
                    />
                  </DataCell>
                  <DataCell><RemarkCell category="esign" documentId={doc.id} /></DataCell>
                  <DataCell className="text-right">
                    {url ? (
                      <ViewBtn
                        onClick={() =>
                          handleViewFile(
                            doc.document_type || 'loan_agreement',
                            url,
                            appNumber,
                            'application/pdf'
                          )
                        }
                      />
                    ) : isSigned ? (
                      <ViewBtn
                        onClick={() =>
                          window.open(
                            `/api/v1/admin/applications/${appNumber || loanApp?.id}/documents/loan-agreement`,
                            '_blank',
                            'noopener,noreferrer'
                          )
                        }
                      />
                    ) : (
                      EMPTY
                    )}
                  </DataCell>
                </tr>
              );
            })
          : ['completed', 'signed'].includes(String(loanApp?.esign_status || '').toLowerCase())
          ? (
              <tr>
                <DataCell>
                  <span className="font-medium text-slate-800">Loan Agreement</span>
                  <span className="ml-2 text-[10px] text-slate-500">(Digitap Aadhaar e-sign)</span>
                </DataCell>
                <DataCell mono>{formatDocDate(loanApp?.updated_at || loanApp?.created_at)}</DataCell>
                <DataCell><StatusText ok okLabel="Signed" /></DataCell>
                <DataCell>{EMPTY}</DataCell>
                <DataCell className="text-right">
                  <ViewBtn
                    onClick={() =>
                      window.open(
                        `/api/v1/admin/applications/${appNumber || loanApp?.id}/documents/loan-agreement`,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  />
                </DataCell>
              </tr>
            )
          : null}
      </DataTable>

      <DataTable
        title="Other documents"
        action={
          !isReadOnly ? (
            <UploadTrigger
              label="Add files"
              uploading={uploadingKey === 'other'}
              accept=".pdf,.jpg,.jpeg,.png"
              onFile={(file) =>
                queueUpload(`Uploading other document: ${file.name}`, () =>
                  handleOtherDocumentUpload(file, file.name || 'Other document')
                )
              }
            />
          ) : (
            <span className="text-[11px] text-slate-500">{otherDocuments.length}</span>
          )
        }
        columns={DOC_COLS}
        emptyMessage={documentsEmptyMessage || 'No other documents uploaded'}
      >
        {initialDocumentsLoad
          ? null
          : otherDocuments.length > 0
          ? otherDocuments.map((doc, i) => (
              <tr key={doc.id || i}>
                <DataCell>{doc.document_label || `Other document ${otherDocuments.length - i}`}</DataCell>
                <DataCell mono>
                  {formatDocDate(doc.created_at)}
                  <CarriedBadge doc={doc} />
                </DataCell>
                <DataCell><StatusText ok={Boolean(doc.document_url)} /></DataCell>
                <DataCell><RemarkCell category="other" documentId={doc.id} /></DataCell>
                <DataCell className="text-right">
                  <div className="inline-flex items-center gap-1 justify-end">
                    {doc.document_url ? (
                      <ViewBtn
                        onClick={() =>
                          handleViewFile(
                            'other_document',
                            doc.document_url,
                            appNumber,
                            doc.file_format || inferFormatFromUrl(doc.document_url)
                          )
                        }
                      />
                    ) : null}
                    {!isReadOnly ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          disabled={uploadingKey === 'other'}
                          onClick={() =>
                            setRenameDialog({
                              open: true,
                              id: doc.id,
                              label: doc.document_label || '',
                            })
                          }
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Rename
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] text-rose-700 border-rose-200"
                          disabled={uploadingKey === 'other'}
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: doc.id,
                              label: doc.document_label || 'this document',
                            })
                          }
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </div>
                </DataCell>
              </tr>
            ))
          : null}
      </DataTable>

      <Dialog
        open={remarkDialog.open}
        onOpenChange={(open) => {
          if (!open) setRemarkDialog({ open: false, category: '', documentId: null, remarkId: null, text: '' });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{remarkDialog.remarkId ? 'Edit remark' : 'Add remark'}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={remarkDialog.text}
            onChange={(e) => setRemarkDialog((p) => ({ ...p, text: e.target.value }))}
            placeholder="Enter remark for this document"
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemarkDialog({ open: false, category: '', documentId: null, remarkId: null, text: '' })}
            >
              Cancel
            </Button>
            <Button disabled={updating || !remarkDialog.text.trim()} onClick={saveRemark}>
              {updating ? 'Saving…' : 'Save remark'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bankPwdDialog.open}
        onOpenChange={(open) => {
          if (!open) setBankPwdDialog({ open: false, file: null, password: '' });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bank statement PDF</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-600">
            File: <span className="font-medium">{bankPwdDialog.file?.name}</span>
          </p>
          <p className="text-xs text-slate-500">
            If the PDF is password-protected, enter the password. Leave blank if it is not protected.
          </p>
          <Input
            type="password"
            autoComplete="off"
            placeholder="PDF password (optional)"
            value={bankPwdDialog.password}
            onChange={(e) => setBankPwdDialog((p) => ({ ...p, password: e.target.value }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankPwdDialog({ open: false, file: null, password: '' })}>
              Cancel
            </Button>
            <Button
              disabled={uploadingKey === 'bank' || !bankPwdDialog.file}
              onClick={async () => {
                const file = bankPwdDialog.file;
                const password = bankPwdDialog.password;
                setBankPwdDialog({ open: false, file: null, password: '' });
                await queueUpload(`Uploading bank statement: ${file.name}`, () =>
                  handleBankStatementUpload(file, password)
                );
              }}
            >
              {uploadingKey === 'bank' ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editPwdDialog.open}
        onOpenChange={(open) => {
          if (!open) setEditPwdDialog({ open: false, statementId: null, password: '' });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit PDF password</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Update or clear the password stored for this bank statement PDF.
          </p>
          <Input
            type="text"
            autoComplete="off"
            placeholder="PDF password"
            value={editPwdDialog.password}
            onChange={(e) => setEditPwdDialog((p) => ({ ...p, password: e.target.value }))}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPwdDialog({ open: false, statementId: null, password: '' })}
            >
              Cancel
            </Button>
            <Button
              disabled={updating || !editPwdDialog.statementId}
              onClick={async () => {
                const ok = await handleUpdateBankStatementPassword(
                  editPwdDialog.statementId,
                  editPwdDialog.password
                );
                if (ok) setEditPwdDialog({ open: false, statementId: null, password: '' });
              }}
            >
              {updating ? 'Saving…' : 'Save password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameDialog.open}
        onOpenChange={(open) => {
          if (!open) setRenameDialog({ open: false, id: null, label: '' });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDialog.label}
            maxLength={255}
            onChange={(e) => setRenameDialog((p) => ({ ...p, label: e.target.value }))}
            placeholder="Document name"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialog({ open: false, id: null, label: '' })}
            >
              Cancel
            </Button>
            <Button
              disabled={uploadingKey === 'other' || !String(renameDialog.label || '').trim()}
              onClick={async () => {
                const ok = await handleRenameOtherDocument(renameDialog.id, renameDialog.label);
                if (ok) setRenameDialog({ open: false, id: null, label: '' });
              }}
            >
              {uploadingKey === 'other' ? 'Saving…' : 'Save name'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, id: null, label: '' });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {`“${deleteDialog.label}” will be removed from this application. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                const id = deleteDialog.id;
                setDeleteDialog({ open: false, id: null, label: '' });
                if (id) handleDeleteOtherDocument(id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
