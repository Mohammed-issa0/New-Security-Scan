'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { adminService } from '@/lib/admin/adminService';
import { Badge, Card, CardContent, CardHeader } from '@/components/scans/ui';
import { User } from 'lucide-react';
import { PanelEmptyState, PanelErrorState } from '@/components/common/AsyncStates';

export default function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('admin.userDetails');
  const tCommon = useTranslations('common.states');

  const { data: user, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminService.users.get(id),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('title')} description={t('subtitle')} icon={User} />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              {t('loading')}
            </div>
          ) : isError ? (
            <PanelErrorState
              title={error instanceof Error ? error.message : tCommon('error')}
              retryLabel={tCommon('retry')}
              onRetry={() => refetch()}
            />
          ) : !user ? (
            <PanelEmptyState title={t('notFound')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-xs text-gray-500">{t('fields.name')}</div>
                <div className="text-gray-900 font-semibold">{user.fullName || t('unknown')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('fields.email')}</div>
                <div className="text-gray-900">{user.email || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('fields.status')}</div>
                {user.isActive ? (
                  <Badge variant="success">{t('status.active')}</Badge>
                ) : (
                  <Badge variant="error">{t('status.inactive')}</Badge>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('fields.createdAt')}</div>
                <div className="text-gray-900">{new Date(user.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('fields.lastLogin')}</div>
                <div className="text-gray-900">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t('fields.roles')}</div>
                <div className="flex flex-wrap gap-1">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    '-'
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
