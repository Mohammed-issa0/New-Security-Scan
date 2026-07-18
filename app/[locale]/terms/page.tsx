import { setRequestLocale } from 'next-intl/server';
import { LegalDocument } from '@/components/legal/LegalDocument';

export default function TermsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);

  return <LegalDocument namespace="termsPage" />;
}
