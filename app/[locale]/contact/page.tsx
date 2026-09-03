import { setRequestLocale } from 'next-intl/server';
import { ContactPageContent } from '@/components/contact/ContactPageContent';

export default function ContactPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);

  return <ContactPageContent />;
}
