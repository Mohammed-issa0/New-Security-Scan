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
