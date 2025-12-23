import { Navbar } from '@/components/landing/Navbar';
import { Hero, Features, Tools } from '@/components/landing/MainSections';
import { HowItWorks, AuthHighlight, TrustSection } from '@/components/landing/SecondarySections';
import { Personas, FinalCTA, Footer } from '@/components/landing/FinalSections';

export default function LandingPage() {
  return (
    <main className="bg-white min-h-screen selection:bg-blue-100 selection:text-blue-700 overflow-x-hidden">
      <Navbar />
      <Hero />
      <div className="space-y-0">
        <Features />
        <Tools />
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

