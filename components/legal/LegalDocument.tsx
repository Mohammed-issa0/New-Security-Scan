'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/FinalSections';
import { LandingAtmosphere } from '@/components/landing/Atmosphere';
import { Container } from '@/components/landing/ui';
import { consumeLegalReturnPath } from '@/lib/navigation/legalReturn';

type LegalSection = {
  title: string;
  body: string;
};

type LegalDocumentProps = {
  namespace: 'privacyPage' | 'termsPage';
};

export function LegalDocument({ namespace }: LegalDocumentProps) {
  const t = useTranslations(namespace);
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === 'ar';
  const sections = t.raw('sections') as LegalSection[];
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    const returnKey = 'legal-return-to';

    const handlePopState = () => {
      const saved = sessionStorage.getItem(returnKey);
      if (!saved) {
        return;
      }

      queueMicrotask(() => {
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (current !== saved) {
          router.replace(saved);
        }
        sessionStorage.removeItem(returnKey);
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  const handleBack = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    const returnTo = consumeLegalReturnPath();
    router.push(returnTo || `/${locale}`);
  }, [locale, router]);

  return (
    <main className="black-brains-landing min-h-screen selection:bg-cyan-200 selection:text-cyan-950 overflow-x-hidden">
      <LandingAtmosphere />
      <Navbar />
      <div className="relative z-10 pt-28 pb-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <button
              type="button"
              onClick={handleBack}
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-cyan-300"
            >
              <BackIcon size={16} />
              {t('back')}
            </button>

            <header className="mb-12 space-y-3">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
                {t('title')}
              </h1>
              <p className="text-sm text-text-muted">{t('lastUpdated')}</p>
              <p className="text-text-secondary leading-relaxed pt-2">{t('intro')}</p>
            </header>

            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h2 className="text-xl font-bold text-text-primary">{section.title}</h2>
                  <p className="text-text-secondary leading-relaxed whitespace-pre-line">{section.body}</p>
                </section>
              ))}
            </div>

            <p className="mt-14 text-sm text-text-muted border-t border-white/8 pt-8">{t('contact')}</p>
          </div>
        </Container>
      </div>
      <Footer />
    </main>
  );
}
