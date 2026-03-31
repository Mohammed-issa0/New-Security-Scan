import { scansService } from './scansService';
import { buildPayload } from './mappers';

export const TOOL_MAPPING: Record<string, string[]> = {
  ffuf: ["DirectoryScanner"],
  zap: ["XssScanner", "SqlInjectionScanner", "SecurityHeadersScanner", "SslScanner"],
  nmap: ["PortScanner"],
  sqlmap: ["SqlInjectionScanner"],
  wpscan: [], // Omit or handle appropriately
};

export async function startScanWithAdapter(formValues: any) {
  const mode = process.env.NEXT_PUBLIC_SCAN_API_MODE || 'v1';

  if (mode === 'vps') {
    // Mode B: Future VPS integration placeholder
    console.log('VPS Mode: Submitting full payload', formValues);
    // return endpoints.scans.createVPS(formValues);
    throw new Error('VPS Mode not implemented yet');
  }

  // Mode A: Current API v1
  const payload = buildPayload(formValues);
  if (!payload.targets || payload.targets.length === 0) {
    throw new Error('At least one target URL is required');
  }

  return await scansService.createScan(payload);
}

