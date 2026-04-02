import AuthGuard from '@/components/auth/AuthGuard';
import { Navbar } from '@/components/landing/Navbar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="app-shell">
        <Navbar />
        <main className="app-content-shell sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

