'use client';

import { Suspense } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/FinalSections';
import { PlansPageContent } from '@/components/plans/PlansPageContent';

export default function PlansPage() {
  return (
    <main className="bg-white min-h-screen selection:bg-blue-100 selection:text-blue-700">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-gray-100" />}>
          <PlansPageContent />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
