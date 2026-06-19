const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

export function ensureTargetUrlScheme(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  if (URL_SCHEME_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function isValidTargetUrl(url: string): boolean {
  const normalized = ensureTargetUrlScheme(url);
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeTargetUrlForCompare(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = new URL(ensureTargetUrlScheme(trimmed));
    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${normalizedPath}${parsed.search}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}
