'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function JiraSettingsPage() {
  const t = useTranslations('jiraOAuth');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();

  const connected = searchParams.get('connected');
  const error = searchParams.get('error');

  useEffect(() => {
    if (connected === 'true') {
      toast.success(t('toasts.connected'));
    }

    if (error) {
      if (error === 'access_denied') {
        toast.error(t('toasts.accessDenied'));
      } else {
        toast.error(t('toasts.failed', { error }));
      }
    }

    if (connected || error) {
      router.replace(`/${locale}/settings/jira`);
    }
  }, [connected, error, locale, router, t]);

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="app-panel rounded-2xl p-6">
        <p className="text-sm text-text-secondary">{t('nextStep')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/jira/projects`}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/28 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/14"
          >
            {t('openJiraProjects')}
          </Link>
        </div>
      </div>
    </div>
  );
}
