'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { scansService } from '@/lib/scans/scansService';
import { toast } from 'sonner';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/scans/ui';
import { BrowserAuthDialog, CreateTargetDialog, DeleteTargetDialog, ViewTargetDialog } from '@/components/targets/TargetDialogs';
import type { PaginatedResponse, Target, TargetBrowserAuthRequest } from '@/lib/api/types';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';

export default function TargetsPage() {
  const t = useTranslations('landing.targets');
  const tCommon = useTranslations('common.states');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [targetToView, setTargetToView] = useState<Target | null>(null);
  const [targetToConfigureAuth, setTargetToConfigureAuth] = useState<Target | null>(null);
  const [targetToDelete, setTargetToDelete] = useState<Target | null>(null);

  const { data: targetsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['targets', page],
    queryFn: () => scansService.getTargets(page),
  });

  const targetsTotalPages =
    targetsData?.totalPages ??
    (targetsData ? Math.max(1, Math.ceil(targetsData.totalCount / targetsData.pageSize)) : 1);

  useEffect(() => {
    if (targetsData && targetsTotalPages > 0 && page > targetsTotalPages) {
      setPage(targetsTotalPages);
    }
  }, [page, targetsData, targetsTotalPages]);

  const updateTargetCaches = (targetId: string, updater: (target: Target) => Target) => {
    queryClient.setQueriesData<PaginatedResponse<Target>>({ queryKey: ['targets'] }, (currentData) => {
      if (!currentData) {
        return currentData;
      }

      return {
        ...currentData,
        items: currentData.items.map((target) => (target.id === targetId ? updater(target) : target)),
      };
    });
  };

  const createMutation = useMutation({
    mutationFn: (url: string) => scansService.createTarget(url),
    onSuccess: async (createdTarget) => {
      setPage(1);
      setIsCreateOpen(false);
      setCreateError(null);
      queryClient.setQueryData<PaginatedResponse<Target> | undefined>(['targets', 1], (currentData) => {
        if (!currentData) {
          return currentData;
        }

        const nextItems = [createdTarget, ...currentData.items.filter((target) => target.id !== createdTarget.id)];

        return {
          ...currentData,
          items: nextItems.slice(0, currentData.pageSize),
          totalCount: currentData.totalCount + 1,
          totalPages: Math.max(1, Math.ceil((currentData.totalCount + 1) / currentData.pageSize)),
        };
      });
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
      toast.success(t('feedback.createSuccess'));
    },
    onError: (error: any) => {
      const backendMessage = error?.data?.message || error?.message || t('feedback.createError');
      setCreateError(backendMessage);
      toast.error(backendMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scansService.deleteTarget(id),
    onMutate: async (targetId: string) => {
      await queryClient.cancelQueries({ queryKey: ['targets'] });
      const previousPages = queryClient.getQueriesData<PaginatedResponse<Target>>({ queryKey: ['targets'] });

      queryClient.setQueriesData<PaginatedResponse<Target>>({ queryKey: ['targets'] }, (currentData) => {
        if (!currentData) {
          return currentData;
        }

        const filteredItems = currentData.items.filter((target) => target.id !== targetId);
        const totalCount = Math.max(0, currentData.totalCount - (filteredItems.length === currentData.items.length ? 0 : 1));

        return {
          ...currentData,
          items: filteredItems,
          totalCount,
          totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / currentData.pageSize),
        };
      });

      return { previousPages };
    },
    onSuccess: async () => {
      setTargetToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
      toast.success(t('feedback.deleteSuccess'));
    },
    onError: (error: any, _targetId, context) => {
      context?.previousPages.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error(error?.message || t('feedback.deleteError'));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });

  const saveBrowserAuthMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TargetBrowserAuthRequest }) =>
      scansService.setTargetBrowserAuth(id, payload),
    onSuccess: async (_result, variables) => {
      updateTargetCaches(variables.id, (target) => ({ ...target, browserAuthConfigured: true }));
      setTargetToView((currentTarget) =>
        currentTarget?.id === variables.id ? { ...currentTarget, browserAuthConfigured: true } : currentTarget,
      );
      setTargetToConfigureAuth((currentTarget) =>
        currentTarget?.id === variables.id ? { ...currentTarget, browserAuthConfigured: true } : currentTarget,
      );
      setTargetToConfigureAuth(null);
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
      toast.success(t('browserAuth.feedback.saveSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.data?.message || error?.message || t('browserAuth.feedback.saveError'));
    },
  });

  const deleteBrowserAuthMutation = useMutation({
    mutationFn: (id: string) => scansService.deleteTargetBrowserAuth(id),
    onSuccess: async (_, targetId) => {
      updateTargetCaches(targetId, (target) => ({ ...target, browserAuthConfigured: false }));
      setTargetToView((currentTarget) =>
        currentTarget?.id === targetId ? { ...currentTarget, browserAuthConfigured: false } : currentTarget,
      );
      setTargetToConfigureAuth((currentTarget) =>
        currentTarget?.id === targetId ? { ...currentTarget, browserAuthConfigured: false } : currentTarget,
      );
      setTargetToConfigureAuth(null);
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
      toast.success(t('browserAuth.feedback.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.data?.message || error?.message || t('browserAuth.feedback.deleteError'));
    },
  });

  const queryErrorMessage =
    error instanceof Error ? error.message : t('feedback.loadError');

  const openCreateDialog = () => {
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const closeCreateDialog = () => {
    if (!createMutation.isPending) {
      setCreateError(null);
      setIsCreateOpen(false);
    }
  };

  const closeDeleteDialog = () => {
    if (!deleteMutation.isPending) {
      setTargetToDelete(null);
    }
  };

  const closeViewDialog = () => {
    setTargetToView(null);
  };

  const closeBrowserAuthDialog = () => {
    if (!saveBrowserAuthMutation.isPending && !deleteBrowserAuthMutation.isPending) {
      setTargetToConfigureAuth(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <Button type="button" onClick={openCreateDialog} className="gap-2 self-start" data-testid="targets-open-create">
          <Plus className="h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('url')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('createdAt')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <TableSkeletonRows columns={3} />
                ) : isError ? (
                  <TableErrorRow
                    columns={3}
                    title={queryErrorMessage || tCommon('error')}
                    retryLabel={tCommon('retry')}
                    onRetry={() => refetch()}
                  />
                ) : !targetsData || targetsData.items.length === 0 ? (
                  <TableEmptyRow columns={3} title={t('noTargets')} />
                ) : (
                  targetsData.items.map((target) => (
                    <tr key={target.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <span className="break-all">{target.url}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(target.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setTargetToView(target)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                            aria-label={t('view')}
                          >
                            <Eye className="h-4 w-4" />
                            <span>{t('view')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetToDelete(target)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={t('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{t('delete')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        {targetsData && targetsTotalPages > 1 && !isError && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('previous')}
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(targetsTotalPages, page + 1))}
                disabled={page === targetsTotalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t('page')} <span className="font-medium">{page}</span> {t('of')} <span className="font-medium">{targetsTotalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">{t('previous')}</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(targetsTotalPages, page + 1))}
                    disabled={page === targetsTotalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">{t('next')}</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateTargetDialog
        isOpen={isCreateOpen}
        onClose={closeCreateDialog}
        onSubmit={(url) => createMutation.mutate(url)}
        isSubmitting={createMutation.isPending}
        errorMessage={createError}
      />

      <ViewTargetDialog
        isOpen={Boolean(targetToView)}
        onClose={closeViewDialog}
        onConfigureAuth={(target) => setTargetToConfigureAuth(target)}
        target={targetToView}
      />

      <BrowserAuthDialog
        isOpen={Boolean(targetToConfigureAuth)}
        onClose={closeBrowserAuthDialog}
        target={targetToConfigureAuth}
        isSaving={saveBrowserAuthMutation.isPending}
        isDeleting={deleteBrowserAuthMutation.isPending}
        onSave={(target, payload) => saveBrowserAuthMutation.mutate({ id: target.id, payload })}
        onDelete={(target) => deleteBrowserAuthMutation.mutate(target.id)}
      />

      <DeleteTargetDialog
        isOpen={Boolean(targetToDelete)}
        onClose={closeDeleteDialog}
        onConfirm={(target) => deleteMutation.mutate(target.id)}
        isSubmitting={deleteMutation.isPending}
        target={targetToDelete}
      />
    </div>
  );
}

