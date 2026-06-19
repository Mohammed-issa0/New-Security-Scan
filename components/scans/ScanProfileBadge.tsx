'use client';

import { useTranslations } from 'next-intl';

const PROFILE_STYLES: Record<string, string> = {
  recon: 'border border-cyan-300/30 bg-cyan-400/12 text-cyan-200',
  quick: 'border border-status-success/28 bg-status-success/12 text-status-success',
  standard: 'border border-white/14 bg-white/8 text-text-secondary',
  deep: 'border border-status-warning/30 bg-status-warning/12 text-status-warning',
};

interface ScanProfileBadgeProps {
  profile?: string | null;
  className?: string;
}

export function ScanProfileBadge({ profile, className = '' }: ScanProfileBadgeProps) {
  const t = useTranslations('scanForm.fields.profile.options');

  if (!profile?.trim()) {
    return null;
  }

  const key = profile.trim().toLowerCase();
  const label = ['recon', 'quick', 'standard', 'deep'].includes(key)
    ? t(`${key}.title`)
    : profile;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        PROFILE_STYLES[key] || PROFILE_STYLES.standard
      } ${className}`}
    >
      {label}
    </span>
  );
}
