const LEGAL_RETURN_KEY = 'legal-return-to';

function isLegalPath(path: string) {
  return /\/(privacy|terms)(\/|$)/.test(path);
}

export function rememberLegalReturnPath() {
  if (typeof window === 'undefined') {
    return;
  }

  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (!path || isLegalPath(path)) {
    return;
  }

  sessionStorage.setItem(LEGAL_RETURN_KEY, path);
}

export function consumeLegalReturnPath() {
  if (typeof window === 'undefined') {
    return null;
  }

  const path = sessionStorage.getItem(LEGAL_RETURN_KEY);
  if (!path) {
    return null;
  }

  sessionStorage.removeItem(LEGAL_RETURN_KEY);
  return path;
}

export function peekLegalReturnPath() {
  if (typeof window === 'undefined') {
    return null;
  }

  return sessionStorage.getItem(LEGAL_RETURN_KEY);
}
