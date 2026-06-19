const STORAGE_KEY = 'scan-name-cache';

type ScanNameCache = Record<string, string>;

function readCache(): ScanNameCache {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as ScanNameCache;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: ScanNameCache) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export function rememberScanName(scanId: string, name: string) {
  const trimmed = name.trim();
  if (!scanId || !trimmed) {
    return;
  }

  const cache = readCache();
  cache[scanId] = trimmed;
  writeCache(cache);
}

export function getRememberedScanName(scanId: string): string | null {
  if (!scanId) {
    return null;
  }

  return readCache()[scanId]?.trim() || null;
}
