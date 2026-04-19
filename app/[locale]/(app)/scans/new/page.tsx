import ScanForm from '@/components/scans/ScanForm';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'scanForm' });
  return {
    title: `${t('title')} | SecurityScan`,
  };
}

export default async function NewScanPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'scanForm' });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{t('title')}</h1>
        <p className="text-sm font-medium text-text-secondary">{t('subtitle')}</p>
      </div>

      <ScanForm
        showAiAssistant={false}
        hideTimeoutField
        hideToolConfig
        hideAdvancedSettings
      />
    </div>
  );
}

