import type { Metadata, Viewport } from "next";
import { Inter, Cairo, Oxanium, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import QueryProvider from '@/components/providers/QueryProvider';
import ToastProvider from '@/components/providers/ToastProvider';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const cairo = Cairo({ subsets: ["arabic"], variable: '--font-cairo' });
const display = Oxanium({ subsets: ["latin"], variable: '--font-display' });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: '--font-mono', weight: ['400', '500', '600'] });

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ar' }];
}

export const metadata: Metadata = {
  title: "Black Brains | Automated Security Testing",
  description: "Premium AI-driven cybersecurity platform for automated website security testing and reporting.",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/imgs/logo1234.png',
    shortcut: '/imgs/logo1234.png',
    apple: '/imgs/logo1234.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#060b14',
  colorScheme: 'dark',
};

export default async function RootLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  // Enable static rendering
  setRequestLocale(locale);
  
  const messages = await getMessages();
  const isRtl = locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable} ${display.variable} ${mono.variable} ${isRtl ? 'font-arabic' : 'font-sans'} antialiased transition-colors duration-300`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            {children}
            <ToastProvider />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

