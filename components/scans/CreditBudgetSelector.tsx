'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Label } from './ui';
import { getEstimatedDurationMinutes } from '@/lib/plans/creditBudget';

interface CreditBudgetSelectorProps {
  value: number;
  onChange: (value: number) => void;
  remainingCredits: number;
  maxRuntimeMinutes?: number;
  maxBudget?: number;
  planName?: string | null;
  error?: string;
}

export function CreditBudgetSelector({
  value,
  onChange,
  remainingCredits,
  maxRuntimeMinutes,
  maxBudget = 4,
  error,
}: CreditBudgetSelectorProps) {
  const t = useTranslations('scanForm.creditBudget');

  if (remainingCredits <= 0) {
    return null;
  }

  const maxSelectable = Math.min(remainingCredits, maxBudget);
  const options = Array.from({ length: maxSelectable }, (_, index) => index + 1);
  const effectiveMaxRuntime =
    maxRuntimeMinutes && value > 0 ? maxRuntimeMinutes * value : null;

  return (
    <div className="space-y-3 rounded-xl border border-cyan-400/18 bg-cyan-400/5 p-4">
      <div className="space-y-1">
        <Label>{t('label')}</Label>
        <p className="text-[11px] text-text-muted">{t('helper', { minutes: maxRuntimeMinutes ?? '—' })}</p>
        <p className="text-[11px] text-text-muted">{t('refundNote')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange(option);
              }}
              className={`min-w-[3rem] rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                isSelected
                  ? 'border-cyan-300 bg-cyan-400/20 text-cyan-200'
                  : 'border-white/14 bg-white/5 text-text-secondary hover:border-cyan-400/30 hover:text-text-primary'
              }`}
              aria-pressed={isSelected}
            >
              {option}
            </button>
          );
        })}
      </div>

      {effectiveMaxRuntime != null && (
        <p className="text-xs font-medium text-cyan-200">
          {t('maxRuntime', { minutes: effectiveMaxRuntime })}
        </p>
      )}

      {error && (
        <p className="text-status-danger text-xs flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
