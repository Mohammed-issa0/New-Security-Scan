'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, Radar, Zap, Shield, Search } from 'lucide-react';
import type { ProfileInfo } from '@/lib/api/types';
import type { ScanProfile } from '@/lib/api/types';
import { DEFAULT_PROFILES } from '@/lib/scans/schema';
import { isProfileAllowedForPlan } from '@/lib/plans/creditBudget';
import { Label } from './ui';

const PROFILE_ICONS: Record<ScanProfile, typeof Radar> = {
  recon: Search,
  quick: Zap,
  standard: Shield,
  deep: Radar,
};

interface ProfileSelectorProps {
  value: ScanProfile;
  onChange: (profile: ScanProfile, defaultCredits: number) => void;
  profiles?: ProfileInfo[] | null;
  planName?: string | null;
  error?: string;
}

function resolveProfiles(profiles?: ProfileInfo[] | null) {
  if (profiles?.length) {
    return profiles
      .filter((p) => p.name)
      .map((p) => ({
        name: p.name as ScanProfile,
        display: p.display || p.name || '',
        defaultCredits: p.defaultCredits ?? 1,
        description: p.description || '',
        planTiers: p.planTiers,
      }));
  }
  return DEFAULT_PROFILES.map((p) => ({ ...p, planTiers: null as string[] | null }));
}

export function ProfileSelector({
  value,
  onChange,
  profiles,
  planName,
  error,
}: ProfileSelectorProps) {
  const t = useTranslations('scanForm.fields.profile');
  const items = resolveProfiles(profiles);

  return (
    <div className="space-y-3">
      <div>
        <Label required>{t('label')}</Label>
        <p className="text-[11px] text-text-muted mt-1">{t('hint')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const allowed = isProfileAllowedForPlan(item.name, planName, item.planTiers);
          const Icon = PROFILE_ICONS[item.name] || Shield;
          const isSelected = value === item.name;
          const displayName = item.display || t(`options.${item.name}.title`);
          const description = item.description || t(`options.${item.name}.description`);

          return (
            <button
              key={item.name}
              type="button"
              disabled={!allowed}
              onClick={() => onChange(item.name, item.defaultCredits)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? 'border-cyan-300/50 bg-cyan-400/12 ring-1 ring-cyan-300/30'
                  : allowed
                    ? 'border-white/14 bg-white/5 hover:border-cyan-400/25 hover:bg-white/8'
                    : 'border-white/10 bg-white/3 opacity-50 cursor-not-allowed'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${isSelected ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/8 text-text-muted'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text-primary">{displayName}</span>
                    <span className="shrink-0 rounded-full border border-white/14 bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase text-text-muted">
                      {t('defaultCredits', { count: item.defaultCredits })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted leading-relaxed">{description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-status-danger text-xs flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
