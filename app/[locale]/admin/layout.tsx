'use client';

import { useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminGuard from '@/components/auth/AdminGuard';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ShieldCheck, ClipboardList, Server, Coins, Layers, Menu, X, ArrowLeft } from 'lucide-react';

const navItems = [
  { key: 'overview', icon: LayoutDashboard, href: '/admin' },
  { key: 'users', icon: Users, href: '/admin/users' },
  { key: 'scans', icon: ShieldCheck, href: '/admin/scans' },
  { key: 'plans', icon: Layers, href: '/admin/plans' },
  { key: 'auditLogs', icon: ClipboardList, href: '/admin/audit-logs' },
  { key: 'queue', icon: Server, href: '/admin/queue' },
  { key: 'billing', icon: Coins, href: '/admin/billing' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = useTranslations('admin.nav');
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const renderNavItems = (onNavigate?: () => void) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const basePath = `/${locale}${item.href}`;
        const isOverview = item.href === '/admin';
        const isActive = isOverview
          ? pathname === basePath
          : pathname === basePath || pathname.startsWith(`${basePath}/`);

        return (
          <Link
            key={item.key}
            href={`/${locale}${item.href}`}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
                : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
            }`}
          >
            <Icon size={16} />
            {t(item.key)}
          </Link>
        );
      })}
    </>
  );

  return (
    <AuthGuard>
      <AdminGuard>
        <div className="min-h-screen bg-slate-100/70">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen((prev) => !prev)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
                  aria-label={isMobileNavOpen ? 'Close admin navigation' : 'Open admin navigation'}
                >
                  {isMobileNavOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Control Center</p>
                  <h1 className="text-sm font-semibold text-slate-900">{t('title')}</h1>
                </div>
              </div>

              <Link
                href={`/${locale}/scans`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                App
              </Link>
            </div>
          </header>

          {isMobileNavOpen && (
            <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
              <nav className="space-y-1">{renderNavItems(() => setIsMobileNavOpen(false))}</nav>
            </div>
          )}

          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_1fr]">
              <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
                <div className="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t('title')}
                </div>
                <nav className="space-y-1">{renderNavItems()}</nav>
              </aside>
              <section className="min-w-0 space-y-6">{children}</section>
            </div>
          </main>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}
