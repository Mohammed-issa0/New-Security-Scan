import type { Metadata } from "next";
import { Inter, Cairo, Space_Grotesk } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import QueryProvider from '@/components/providers/QueryProvider';
import ToastProvider from '@/components/providers/ToastProvider';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const cairo = Cairo({ subsets: ["arabic"], variable: '--font-cairo' });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: '--font-display' });

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ar' }];
}

export const metadata: Metadata = {
  title: "SecurityScan | Automated Security Scanning for Modern Apps",
  description: "Unified cloud interface for OWASP ZAP, FFUF, Nmap, and more. Scan websites and APIs with ease.",
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
      <body className={`${inter.variable} ${cairo.variable} ${spaceGrotesk.variable} ${isRtl ? 'font-arabic' : 'font-sans'} antialiased transition-colors duration-300`}>
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

