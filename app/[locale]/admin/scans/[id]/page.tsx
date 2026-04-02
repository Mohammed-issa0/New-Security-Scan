'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Download, FileSearch, RefreshCcw, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/lib/admin/adminService';
import { Badge, Button, Card, CardContent, CardHeader, Label, Select, Textarea } from '@/components/scans/ui';
import { PanelEmptyState, PanelErrorState } from '@/components/common/AsyncStates';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

const STATUS_OPTIONS = ['Pending', 'Running', 'Completed', 'Failed', 'Canceled'];

export default function AdminScanDetailsPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const t = useTranslations('admin.scans');
  const tCommon = useTranslations('common.states');
  const tConfirm = useTranslations('common.confirmation');
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [forceFailReason, setForceFailReason] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmForceFailOpen, setConfirmForceFailOpen] = useState(false);

  const { data: scan, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-scan', id],
    queryFn: () => adminService.scans.get(id),
  });

  useEffect(() => {
    if (!scan) {
      return;
    }
    setStatus(scan.status || '');
    setFailureReason(scan.failureReason || '');
  }, [scan]);

  const updateMutation = useMutation({
    mutationFn: (payload: { status?: string; failureReason?: string | null }) =>
      adminService.scans.update(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-scan', id] }),
        queryClient.invalidateQueries({ queryKey: ['admin-scans'] }),
      ]);
      toast.success(t('details.updateSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('details.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminService.scans.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-scans'] });
      toast.success(t('details.deleteSuccess'));
      router.replace(`/${locale}/admin/scans`);
    },
    onError: (err: any) => {
      toast.error(err?.message || t('details.deleteError'));
    },
  });

  const forceFailMutation = useMutation({
    mutationFn: (reason?: string) => adminService.scans.forceFail(id, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-scan', id] }),
        queryClient.invalidateQueries({ queryKey: ['admin-scans'] }),
      ]);
      await refetch();
      setForceFailReason('');
      toast.success(t('details.forceFailSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('details.forceFailError'));
    },
  });

  const exportPdfMutation = useMutation({
    mutationFn: () => adminService.scans.exportPdf(id),
    onSuccess: (blob) => {
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `admin-scan-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      toast.success(t('details.exportSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('details.exportError'));
    },
  });

  const submitUpdate = () => {
    if (!status) {
      toast.error(t('details.validation.statusRequired'));
      return;
    }

    const isFailedStatus = status.toLowerCase() === 'failed';
    if (isFailedStatus && !failureReason.trim()) {
      toast.error(t('details.validation.failureReasonRequired'));
      return;
    }

    updateMutation.mutate({
      status,
      failureReason: failureReason.trim() ? failureReason.trim() : null,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/admin/scans`} className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
          <ArrowLeft size={16} />
          {t('details.backToList')}
        </Link>
      </div>

      <Card>
        <CardHeader title={t('details.title')} description={t('details.subtitle')} icon={FileSearch} />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
              {t('loading')}
            </div>
          ) : isError ? (
            <PanelErrorState
              title={error instanceof Error ? error.message : tCommon('error')}
              retryLabel={tCommon('retry')}
              onRetry={() => refetch()}
            />
          ) : !scan ? (
            <PanelEmptyState title={t('details.notFound')} />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-text-muted">{t('columns.id')}</p>
                  <p className="break-all font-medium text-text-primary">{scan.id}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">{t('columns.targetId')}</p>
                  <p className="break-all font-medium text-text-primary">{scan.targetId || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">{t('columns.requestedAt')}</p>
                  <p className="text-text-primary">{scan.requestedAt ? new Date(scan.requestedAt).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">{t('columns.finishedAt')}</p>
                  <p className="text-text-primary">{scan.finishedAt ? new Date(scan.finishedAt).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">{t('details.currentStatus')}</p>
                  <Badge variant="outline">{scan.status || '-'}</Badge>
                </div>
                <div>
                  <p className="text-xs text-text-muted">{t('details.currentFailureReason')}</p>
                  <p className="text-text-primary">{scan.failureReason || '-'}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-2"
                    onClick={() => exportPdfMutation.mutate()}
                    disabled={
                      isLoading ||
                      updateMutation.isPending ||
                      forceFailMutation.isPending ||
                      exportPdfMutation.isPending
                    }
                  >
                    <Download size={16} />
                    {exportPdfMutation.isPending ? t('details.exporting') : t('details.export')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-2"
                    onClick={() => refetch()}
                    disabled={isLoading || updateMutation.isPending || forceFailMutation.isPending || exportPdfMutation.isPending}
                  >
                    <RefreshCcw size={16} />
                    {t('details.refreshStatus')}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/12 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-text-primary">{t('details.updateSectionTitle')}</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="status">{t('details.statusLabel')}</Label>
                    <Select id="status" value={status} onChange={(event) => setStatus(event.target.value)}>
                      <option value="">{t('details.selectStatus')}</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="failureReason">{t('details.failureReasonLabel')}</Label>
                    <Textarea
                      id="failureReason"
                      value={failureReason}
                      onChange={(event) => setFailureReason(event.target.value)}
                      placeholder={t('details.failureReasonPlaceholder')}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button type="button" onClick={submitUpdate} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? t('details.updating') : t('details.updateButton')}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-status-danger/35 bg-status-danger/10 p-4">
                <h3 className="text-sm font-semibold text-status-danger">{t('details.dangerZone')}</h3>
                <p className="mt-1 text-sm text-status-danger">{t('details.forceFailDescription')}</p>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="forceFailReason" className="text-status-danger">{t('details.forceFailReasonLabel')}</Label>
                  <Textarea
                    id="forceFailReason"
                    value={forceFailReason}
                    onChange={(event) => setForceFailReason(event.target.value)}
                    placeholder={t('details.forceFailReasonPlaceholder')}
                    className="border-status-danger/40 bg-slate-950/50"
                  />
                  <div>
                    <Button
                      type="button"
                      variant="danger"
                      className="inline-flex items-center gap-2"
                      onClick={() => setConfirmForceFailOpen(true)}
                      disabled={forceFailMutation.isPending}
                    >
                      <XCircle size={16} />
                      {forceFailMutation.isPending ? t('details.forceFailing') : t('details.forceFailButton')}
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-status-danger">{t('details.deleteDescription')}</p>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="danger"
                    className="inline-flex items-center gap-2"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={16} />
                    {deleteMutation.isPending ? t('details.deleting') : t('details.deleteButton')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={confirmDeleteOpen}
        title={t('details.deleteConfirmTitle')}
        description={t('details.deleteConfirmDescription')}
        confirmLabel={deleteMutation.isPending ? tConfirm('processing') : t('details.deleteButton')}
        cancelLabel={tConfirm('cancel')}
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setConfirmDeleteOpen(false);
          }
        }}
        onConfirm={() => {
          deleteMutation.mutate(undefined, {
            onSettled: () => setConfirmDeleteOpen(false),
          });
        }}
      />

      <ConfirmationDialog
        isOpen={confirmForceFailOpen}
        title={t('details.forceFailConfirmTitle')}
        description={t('details.forceFailConfirmDescription')}
        confirmLabel={forceFailMutation.isPending ? tConfirm('processing') : t('details.forceFailButton')}
        cancelLabel={tConfirm('cancel')}
        isPending={forceFailMutation.isPending}
        onClose={() => {
          if (!forceFailMutation.isPending) {
            setConfirmForceFailOpen(false);
          }
        }}
        onConfirm={() => {
          const normalizedReason = forceFailReason.trim();
          forceFailMutation.mutate(normalizedReason || undefined, {
            onSettled: () => setConfirmForceFailOpen(false),
          });
        }}
      />
    </div>
  );
}
