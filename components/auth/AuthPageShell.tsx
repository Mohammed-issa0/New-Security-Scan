'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { LandingAtmosphere } from '@/components/landing/Atmosphere';
import logo from '/public/imgs/logo1234.png';

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  footerPrefix: string;
  footerLinkLabel: string;
  footerHref: string;
  formChildren: ReactNode;
};

export function AuthPageShell({
  title,
  subtitle,
  footerPrefix,
  footerLinkLabel,
  footerHref,
  formChildren,
}: AuthPageShellProps) {
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <div className="relative min-h-screen overflow-hidden bg-cyber-bg text-text-primary">
      <LandingAtmosphere />

      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top,rgba(0,209,255,0.08),transparent_32%),linear-gradient(180deg,rgba(6,11,20,0.58),rgba(6,11,20,0.82))]" />

      <div className="relative z-[3] mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="cyber-panel w-full overflow-hidden rounded-[2rem] border border-cyan-400/14 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:p-6 lg:p-8"
        >
          <div className="flex items-start gap-4 border-b border-white/8 pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/6 shadow-[0_0_24px_rgba(0,209,255,0.16)]">
              <Image src={logo} alt="Black Brains" width={56} height={56} className="h-full w-full object-contain p-2" priority />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">Black Brains</p>
              <h2 className="mt-2 text-3xl font-bold text-text-primary sm:text-4xl">{title}</h2>
              <p className="mt-2 max-w-lg text-sm leading-7 text-text-secondary sm:text-base">{subtitle}</p>
            </div>
          </div>

          <div className="pt-6">{formChildren}</div>

          <div className="mt-6 border-t border-white/8 pt-5 text-center text-sm text-text-secondary">
            <span>{footerPrefix}</span>{' '}
            <Link href={footerHref} className="font-semibold text-cyan-300 transition hover:text-cyan-200">
              {footerLinkLabel}
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
