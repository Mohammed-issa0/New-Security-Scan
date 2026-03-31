'use client';

import { Toaster } from 'sonner';
import { useLocale } from 'next-intl';

export default function ToastProvider() {
  const locale = useLocale();
  const isRtl = locale === 'ar';

  return (
    <Toaster 
      position={isRtl ? 'top-left' : 'top-right'}
      dir={isRtl ? 'rtl' : 'ltr'}
      richColors
      closeButton
    />
  );
}

