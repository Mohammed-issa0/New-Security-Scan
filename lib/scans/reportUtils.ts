import type { Report, Vulnerability } from '@/lib/api/types';

export type SeverityCounts = {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
  Info: number;
};

const EMPTY_SEVERITY_COUNTS: SeverityCounts = {
  Critical: 0,
  High: 0,
  Medium: 0,
  Low: 0,
  Info: 0,
};

export function buildSeverityCounts(
  report: Report | null | undefined,
  vulnerabilities?: Vulnerability[] | null
): SeverityCounts {
  if (report) {
    return {
      Critical: report.criticalCount ?? report.vulnerabilityCounts?.Critical ?? 0,
      High: report.highCount ?? report.vulnerabilityCounts?.High ?? 0,
      Medium: report.mediumCount ?? report.vulnerabilityCounts?.Medium ?? 0,
      Low: report.lowCount ?? report.vulnerabilityCounts?.Low ?? 0,
      Info: report.infoCount ?? report.vulnerabilityCounts?.Info ?? 0,
    };
  }

  const counts = { ...EMPTY_SEVERITY_COUNTS };
  for (const vulnerability of vulnerabilities ?? []) {
    const severity = vulnerability.severity;
    if (severity in counts) {
      counts[severity as keyof SeverityCounts] += 1;
    }
  }

  return counts;
}

export function getTotalVulnerabilities(
  report: Report | null | undefined,
  severityCounts: SeverityCounts,
  vulnerabilities?: Vulnerability[] | null
) {
  if (typeof report?.totalVulnerabilities === 'number') {
    return report.totalVulnerabilities;
  }

  const fromCounts = Object.values(severityCounts).reduce((sum, value) => sum + value, 0);
  if (fromCounts > 0) {
    return fromCounts;
  }

  return vulnerabilities?.length ?? 0;
}

export function getOverallRiskScore(report: Report | null | undefined) {
  return report?.overallRiskScore ?? report?.riskScore ?? 0;
}

const SEVERITY_LABELS: Vulnerability['severity'][] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

// ZAP risk codes (used by SecurityHeadersScanner and other zap-family tools): 0=Info, 1=Low, 2=Medium, 3=High.
const ZAP_RISK_CODE_LABELS: Record<number, Vulnerability['severity']> = {
  0: 'Info',
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export function normalizeSeverity(value: unknown): Vulnerability['severity'] {
  if (typeof value === 'string') {
    const match = SEVERITY_LABELS.find((label) => label.toLowerCase() === value.trim().toLowerCase());
    if (match) return match;
  }

  const asNumber = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(asNumber) && ZAP_RISK_CODE_LABELS[asNumber]) {
    return ZAP_RISK_CODE_LABELS[asNumber];
  }

  return 'Info';
}

export function normalizeVulnerabilitySeverities<T extends { severity: Vulnerability['severity'] }>(
  vulnerabilities: T[]
): T[] {
  return vulnerabilities.map((vulnerability) => ({
    ...vulnerability,
    severity: normalizeSeverity(vulnerability.severity),
  }));
}

export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
