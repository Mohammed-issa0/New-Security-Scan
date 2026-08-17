'use client';

import type { CSSProperties } from 'react';
import { Toaster } from 'sonner';
import { useLocale } from 'next-intl';

export default function ToastProvider() {
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <Toaster
      position={isRtl ? 'top-left' : 'top-right'}
      dir={isRtl ? 'rtl' : 'ltr'}
      closeButton
      toastOptions={{
        style: {
          borderRadius: '0.75rem',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 24px 90px rgba(0, 0, 0, 0.45), 0 0 48px rgba(0, 209, 255, 0.08)',
        } as CSSProperties,
        classNames: {
          title: 'font-bold text-sm',
          description: '!opacity-80 text-sm leading-relaxed',
          closeButton:
            '!bg-white/5 !border-white/10 !text-text-secondary hover:!text-text-primary hover:!bg-white/10',
        },
      }}
      style={
        {
          '--normal-bg': 'rgba(15, 26, 43, 0.92)',
          '--normal-border': 'rgba(0, 209, 255, 0.18)',
          '--normal-text': 'rgb(230 241 255)',
          '--success-bg': 'rgba(0, 200, 150, 0.14)',
          '--success-border': 'rgba(0, 200, 150, 0.32)',
          '--success-text': 'rgb(178, 255, 235)',
          '--error-bg': 'rgba(255, 77, 79, 0.14)',
          '--error-border': 'rgba(255, 77, 79, 0.35)',
          '--error-text': 'rgb(255, 205, 206)',
          '--warning-bg': 'rgba(255, 176, 32, 0.14)',
          '--warning-border': 'rgba(255, 176, 32, 0.35)',
          '--warning-text': 'rgb(255, 224, 178)',
        } as CSSProperties
      }
    />
  );
}

