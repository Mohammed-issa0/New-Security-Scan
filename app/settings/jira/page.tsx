import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function SettingsJiraRedirectPage({
  searchParams,
}: {
  searchParams?: { connected?: string; error?: string };
}) {
  const localeCookie = cookies().get('NEXT_LOCALE')?.value;
  const locale = localeCookie === 'ar' || localeCookie === 'en' ? localeCookie : 'en';

  const params = new URLSearchParams();
  if (searchParams?.connected) {
    params.set('connected', searchParams.connected);
  }
  if (searchParams?.error) {
    params.set('error', searchParams.error);
  }

  const query = params.toString();
  redirect(`/${locale}/settings/jira${query ? `?${query}` : ''}`);
}
