export type Tool = 'ffuf' | 'nmap' | 'zap' | 'wpscan' | 'sqlmap' | 'xss' | 'ssl';
export type ScanDepth = 'light' | 'deep' | 'aggressive';

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
  targetId: string;
  targets: string;
  tool: Tool;
  scopeSigned: boolean;
  timeoutMinutes?: number;
  notes?: string;
  target_config: {
    user_agent?: string;
    headers: HeaderRow[];
    authentication: {
      token?: string;
      cookies: CookieRow[];
    };
  };
  tool_depth: ScanDepth;
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
  scopeSigned: boolean;
  targets: string[];
  tool: Tool;
  notes?: string;
  targetConfig?: {
    userAgent?: string;
    headers?: Record<string, string>;
    authentication?: {
      token?: string;
      cookies?: { name: string; value: string }[];
    };
  };
  toolConfig?: Record<string, any>;
  toolDepths?: Record<string, ScanDepth>;
  extraArgs?: string;
  timeoutMinutes?: number;
}



