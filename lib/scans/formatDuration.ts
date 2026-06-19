export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) {
    return '—';
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

export function remainingSecondsUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) {
    return null;
  }

  const target = new Date(isoDate).getTime();
  if (Number.isNaN(target)) {
    return null;
  }

  return Math.max(0, Math.round((target - Date.now()) / 1000));
}
