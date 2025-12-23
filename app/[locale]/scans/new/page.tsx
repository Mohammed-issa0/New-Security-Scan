import ScanForm from '@/components/scans/ScanForm';
import { checkCredits } from '@/lib/scans/api';
import { Coins, Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import Link from 'next/link';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'scanForm' });
  return {
    title: `${t('title')} | SecurityScan`,
  };
}

export default async function NewScanPage({ params: { locale } }: { params: { locale: string } }) {
  const credits = await checkCredits();
  const t = await getTranslations({ locale, namespace: 'scanForm' });
  const isSharedMode = process.env.NEXT_PUBLIC_SCAN_SUBMIT_MODE === 'shared';

  return (
    <main className="min-h-screen bg-[#FAFAFB] pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Shield size={22} fill="currentColor" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900 ltr-only">SecurityScan</span>
              <span className="text-xl font-extrabold tracking-tight text-gray-900 rtl-only">سكيوريتي سكان</span>
            </Link>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
              <p className="text-xs text-gray-500 font-medium">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isSharedMode && (
              <div className="bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 flex items-center gap-2">
                <Coins size={16} className="text-blue-600" />
                <span className="text-sm font-bold text-blue-700">
                  {t('summary.credits', { count: credits === Infinity ? 1 : credits })}
                </span>
              </div>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <ScanForm />
      </div>
    </main>
  );
}

