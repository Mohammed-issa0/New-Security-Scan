import { scansService } from './scansService';
import { buildPayload, buildProfilePayload } from './mappers';
import { rememberScanName } from './scanNameCache';
import { getScanDisplayName } from './scanStatus';
import type { ProfileScanFormSchemaType } from './schema';
import type { ScanFormValues } from './types';

export const TOOL_MAPPING: Record<string, string[]> = {
  ffuf: ['DirectoryScanner'],
  zap: ['XssScanner', 'SqlInjectionScanner', 'SecurityHeadersScanner', 'SslScanner'],
  nmap: ['PortScanner'],
  sqlmap: ['SqlInjectionScanner'],
  wpscan: [],
};

export type ScanFormSubmitValues = ScanFormValues | ProfileScanFormSchemaType;

export function isProfileFormValues(
  values: ScanFormSubmitValues
): values is ProfileScanFormSchemaType {
  return 'profile' in values && !('tool' in values);
}

export async function startScanWithAdapter(formValues: ScanFormSubmitValues) {
  const mode = process.env.NEXT_PUBLIC_SCAN_API_MODE || 'v1';

  if (mode === 'vps') {
    throw new Error('VPS Mode not implemented yet');
  }

  if (isProfileFormValues(formValues)) {
    const payload = buildProfilePayload(formValues);
    const created = await scansService.createScan(payload);
    if (created?.id) {
      rememberScanName(created.id, getScanDisplayName(created) || formValues.name);
    }
    return created;
  }

  const payload = buildPayload(formValues);
  if (!payload.targets || payload.targets.length === 0) {
    throw new Error('At least one target URL is required');
  }

  const created = await scansService.createScan(payload);
  if (created?.id) {
    rememberScanName(created.id, getScanDisplayName(created) || formValues.name);
  }
  return created;
}
