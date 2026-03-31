'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, Badge, Button } from '@/components/scans/ui';
import { ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { adminService } from '@/lib/admin/adminService';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';

export default function AdminAuditLogsPage() {
  const t = useTranslations('admin.auditLogs');
  const tCommon = useTranslations('common.states');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => adminService.auditLogs.list(page, 100),
  });

  const logs = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const pageSize = data?.pageSize ?? 100;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const actionOptions = useMemo(() => {
    const uniqueActions = Array.from(new Set(logs.map((log) => (log.action || '').trim()).filter(Boolean)));
    return uniqueActions.sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      const action = (log.action || '').trim();
      const matchesAction = actionFilter === 'all' || action.toLowerCase() === actionFilter.toLowerCase();

      if (!matchesAction) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        log.action,
        log.entityName,
        log.entityId,
        log.user?.email,
        log.userId,
        log.ipAddress,
        log.timestamp,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [logs, search, actionFilter]);

  const hasActiveFilters = search.trim().length > 0 || actionFilter !== 'all';

  return (
    <Card>
      <CardHeader title={t('title')} description={t('subtitle')} icon={ClipboardList} />
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-medium text-gray-600">{t('filters.searchLabel')}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">{t('filters.actionLabel')}</span>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
            >
              <option value="all">{t('filters.allActions')}</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs text-blue-800">{t('filters.activeHint')}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setActionFilter('all');
              }}
            >
              {t('filters.clear')}
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.action')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.entity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.ip')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.timestamp')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <TableSkeletonRows columns={5} />
              ) : isError ? (
                <TableErrorRow
                  columns={5}
                  title={error instanceof Error ? error.message : tCommon('error')}
                  retryLabel={tCommon('retry')}
                  onRetry={() => refetch()}
                />
              ) : filteredLogs.length === 0 ? (
                <TableEmptyRow columns={5} title={hasActiveFilters ? t('emptyFiltered') : t('empty')} />
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <Badge variant="outline">{log.action || '-'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {log.entityName || '-'} {log.entityId ? `#${log.entityId}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {log.user?.email || log.userId || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.ipAddress || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-xs text-gray-500">
            {t('pagination', { page, totalPages, total: totalCount })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              {t('actions.prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              {t('actions.next')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
