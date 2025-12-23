import { ScanFormValues, ScanPayload, HeaderRow, CookieRow } from './types';

export const parseTargets = (text: string | undefined | null): string[] => {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

export const headersRowsToObject = (rows: HeaderRow[]): Record<string, string> => {
  return rows.reduce((acc, row) => {
    if (row.name && row.value) {
      acc[row.name] = row.value;
    }
    return acc;
  }, {} as Record<string, string>);
};

export const cookiesRowsToArray = (rows: CookieRow[]): { name: string; value: string }[] => {
  return rows.filter((row) => row.name && row.value);
};

export const booleanToString = (value: boolean): 'true' | 'false' => {
  return value ? 'true' : 'false';
};

export const buildPayload = (values: ScanFormValues): ScanPayload => {
  const payload: ScanPayload = {
    name: values.name,
    scope_signed: true,
    targets: parseTargets(values.targets),
    tool: values.tool,
    notes: values.notes,
    target_config: {
      user_agent: values.target_config.user_agent,
      headers: headersRowsToObject(values.target_config.headers),
      authentication: {
        token: values.target_config.authentication.token,
        cookies: cookiesRowsToArray(values.target_config.authentication.cookies),
      },
    },
    extra_args: values.extra_args,
  };

  if (values.tool === 'zap' && values.zap_config) {
    payload.tool_config = {
      'scan-type': values.zap_config['scan-type'],
      ajax: booleanToString(values.zap_config.ajax),
    };
  } else if (values.tool === 'ffuf' && values.ffuf_config) {
    payload.tool_config = {
      wordlist: values.ffuf_config.wordlist,
      recursion: booleanToString(values.ffuf_config.recursion),
      mc: values.ffuf_config.mc,
      fc: values.ffuf_config.fc,
    };
  }

  return payload;
};

