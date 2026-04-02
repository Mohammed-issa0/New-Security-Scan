'use client';

import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

type AppErrorFallbackProps = {
  title: string;
  description: string;
  errorId?: string;
  retryLabel: string;
  homeLabel: string;
  onRetry?: () => void;
  onHome?: () => void;
};

export default function AppErrorFallback({
  title,
  description,
  errorId,
  retryLabel,
  homeLabel,
  onRetry,
  onHome,
}: AppErrorFallbackProps) {
  return (
    <div className="min-h-[40vh] rounded-2xl border border-status-danger/25 bg-[linear-gradient(180deg,rgba(220,38,38,0.14),rgba(6,12,22,0.95))] p-6 sm:p-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-status-danger/35 bg-status-danger/16 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-status-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          Runtime error
        </div>

        <div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-7 text-text-secondary sm:text-base">{description}</p>
        </div>

        {errorId ? (
          <p className="rounded-xl border border-white/14 bg-white/6 px-3 py-2 font-mono text-xs text-text-muted">
            Error ID: {errorId}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/28 bg-cyan-400/12 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/18"
            >
              <RefreshCw className="h-4 w-4" />
              {retryLabel}
            </button>
          ) : null}

          {onHome ? (
            <button
              type="button"
              onClick={onHome}
              className="inline-flex items-center gap-2 rounded-lg border border-white/16 bg-white/8 px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-white/12"
            >
              <Home className="h-4 w-4" />
              {homeLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
