'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }));

  useEffect(() => {
    const handleSessionEnd = () => {
      queryClient.clear();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-ended', handleSessionEnd);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:session-ended', handleSessionEnd);
      }
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

