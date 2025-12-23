export type Tool = 'ffuf' | 'nmap' | 'zap' | 'wpscan' | 'sqlmap';

export interface HeaderRow {
  name: string;
  value: string;
}

export interface CookieRow {
  name: string;
  value: string;
}

export interface ScanFormValues {
  name: string;
  targets: string;
  tool: Tool;
  notes?: string;
  target_config: {
    user_agent?: string;
    headers: HeaderRow[];
    authentication: {
      token?: string;
      cookies: CookieRow[];
    };
  };
  zap_config?: {
    'scan-type': 'baseline' | 'full' | 'api';
    ajax: boolean;
  };
  ffuf_config?: {
    wordlist: string;
    recursion: boolean;
    mc: string;
    fc: string;
  };
  extra_args?: string;
  has_captcha: boolean;
}

export interface ScanPayload {
  name: string;
  scope_signed: true;
  targets: string[];
  tool: string;
  notes?: string;
  target_config?: {
    user_agent?: string;
    headers?: Record<string, string>;
    authentication?: {
      token?: string;
      cookies?: { name: string; value: string }[];
    };
  };
  tool_config?: Record<string, any>;
  extra_args?: string;
}

