import { Navbar } from '@/components/landing/Navbar';
import { Hero, Features, Tools } from '@/components/landing/MainSections';
import { HowItWorks, AuthHighlight, TrustSection } from '@/components/landing/SecondarySections';
import { Personas, FinalCTA, Footer } from '@/components/landing/FinalSections';
import { LandingAtmosphere } from '@/components/landing/Atmosphere';
import { PlansPageContent } from '@/components/plans/PlansPageContent';
import { FloatingAssistant } from '@/components/guided-setup/FloatingAssistant';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

export default function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const fontClass = locale === 'ar' ? 'font-arabic' : 'font-sans';

  return (
    <main className={`black-brains-landing min-h-screen selection:bg-cyan-200 selection:text-cyan-950 overflow-x-hidden ${fontClass}`}>
      <LandingAtmosphere />
      <Navbar />
      <div className="relative z-10">
        <Hero />
        <Features />
        <Tools />
        <section id="plans" className="relative border-y border-white/5 bg-[linear-gradient(180deg,rgba(8,16,27,0.96),rgba(11,19,32,0.92))]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-white/6" />}>
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
      <FloatingAssistant />
    </main>
  );
}
