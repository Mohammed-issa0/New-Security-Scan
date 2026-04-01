import { Navbar } from '@/components/landing/Navbar';
import { Hero, Features, Tools } from '@/components/landing/MainSections';
import { HowItWorks, AuthHighlight, TrustSection } from '@/components/landing/SecondarySections';
import { Personas, FinalCTA, Footer } from '@/components/landing/FinalSections';
import { PlansPageContent } from '@/components/plans/PlansPageContent';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

export default function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const fontClass = locale === 'ar' ? 'font-arabic' : 'font-display';

  return (
    <main className={`landing-ambient min-h-screen selection:bg-blue-100 selection:text-blue-700 overflow-x-hidden ${fontClass} bg-[#f8fafc]`}>
      <Navbar />
      <Hero />
      <div className="space-y-0 relative z-10">
        <Features />
        <Tools />
        <section id="plans" className="bg-gray-50/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-gray-100" />}>
              <PlansPageContent mode="section" />
            </Suspense>
          </div>
        </section>
        <HowItWorks />
        <AuthHighlight />
        <TrustSection />
        <Personas />
        <FinalCTA />
      </div>
      <Footer />
    </main>
  );
}
