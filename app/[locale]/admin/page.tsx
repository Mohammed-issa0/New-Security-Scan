'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { adminService } from '@/lib/admin/adminService';
import { Badge, Button, Card, CardContent, CardHeader } from '@/components/scans/ui';
import { ClipboardList, Layers, Server, ShieldCheck, Users } from 'lucide-react';

export default function AdminOverviewPage() {
  const locale = useLocale();
  const t = useTranslations('admin.overview');

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-overview-users'],
    queryFn: () => adminService.users.list(1, 1),
  });

  const { data: scansData, isLoading: scansLoading } = useQuery({
    queryKey: ['admin-overview-scans'],
    queryFn: () => adminService.scans.list(1, 1),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-overview-audit'],
    queryFn: () => adminService.auditLogs.list(1, 1),
  });

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['admin-overview-queue'],
    queryFn: () => adminService.queue.status(),
    refetchInterval: 5000,
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-overview-plans'],
    queryFn: () => adminService.plans.list(),
  });

  const { data: userPlansData, isLoading: userPlansLoading } = useQuery({
    queryKey: ['admin-overview-user-plans'],
    queryFn: () => adminService.plans.userPlans.list(1, 1),
  });

  const formatNumber = (value?: number) => new Intl.NumberFormat(locale).format(value ?? 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('title')} description={t('subtitle')} icon={ShieldCheck} />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="text-xs font-semibold text-gray-500">{t('stats.users')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {usersLoading ? t('loading') : formatNumber(usersData?.totalCount)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="text-xs font-semibold text-gray-500">{t('stats.scans')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {scansLoading ? t('loading') : formatNumber(scansData?.totalCount)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="text-xs font-semibold text-gray-500">{t('stats.auditLogs')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {auditLoading ? t('loading') : formatNumber(auditData?.totalCount)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="text-xs font-semibold text-gray-500">{t('stats.queue')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {queueLoading ? t('loading') : formatNumber(queueData?.queueSize)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="text-xs font-semibold text-gray-500">{t('stats.plans')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {plansLoading ? t('loading') : formatNumber(plansData?.length)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="text-xs font-semibold text-gray-500">{t('stats.userPlans')}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {userPlansLoading ? t('loading') : formatNumber(userPlansData?.totalCount)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={t('actions.title')}
          description={t('actions.subtitle')}
          icon={Users}
        />
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href={`/${locale}/admin/users`}>
              <Button variant="outline" size="sm">
                {t('actions.users')}
              </Button>
            </Link>
            <Link href={`/${locale}/admin/scans`}>
              <Button variant="outline" size="sm">
                {t('actions.scans')}
              </Button>
            </Link>
            <Link href={`/${locale}/admin/queue`}>
              <Button variant="outline" size="sm">
                {t('actions.queue')}
              </Button>
            </Link>
            <Link href={`/${locale}/admin/billing`}>
              <Button variant="outline" size="sm">
                {t('actions.billing')}
              </Button>
            </Link>
            <Badge variant="outline">
              {t('actions.liveQueue', { count: queueData?.queueSize ?? 0 })}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
