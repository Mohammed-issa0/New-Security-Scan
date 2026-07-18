'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const LANDING_SECTIONS = new Set(['features', 'tools', 'plans', 'how-it-works']);

export function LandingHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const isLanding =
      pathname === '/en' ||
      pathname === '/ar' ||
      pathname === '/en/' ||
      pathname === '/ar/';

    if (!isLanding || typeof window === 'undefined') {
      return;
    }

    const scrollToHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash || !LANDING_SECTIONS.has(hash)) {
        return;
      }

      const section = document.getElementById(hash);
      if (!section) {
        return;
      }

      const top = section.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    const frame = window.requestAnimationFrame(() => {
      window.setTimeout(scrollToHash, 50);
    });

    window.addEventListener('hashchange', scrollToHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, [pathname]);

  return null;
}
