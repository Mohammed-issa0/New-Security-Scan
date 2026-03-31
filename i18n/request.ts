<<<<<<< HEAD
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

export const locales = ['en', 'ar'];

export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  
  if (!locale || !locales.includes(locale as any)) notFound();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
=======
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

export const locales = ['en', 'ar'];

export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  
  if (!locale || !locales.includes(locale as any)) notFound();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
>>>>>>> f20558da0e9739abef83058bed2216a60f039e2e
