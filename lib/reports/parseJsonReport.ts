import type {
  JsonExecutiveSummary,
  JsonPriorityFixRow,
  JsonReportDocument,
  JsonVulnerability,
} from './jsonReportTypes';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function parseExecutiveSummary(raw: unknown): JsonExecutiveSummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  return {
    headline: pickString(record, ['headline']),
    summary: pickString(record, ['summary']),
    keyRisks: asStringArray(record.key_risks ?? record.keyRisks),
    recommendedNextSteps: asStringArray(
      record.recommended_next_steps ?? record.recommendedNextSteps
    ),
  };
}

function parseVulnerability(raw: unknown): JsonVulnerability | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const affected = record.affected;
  const affectedList = Array.isArray(affected)
    ? affected.filter((item): item is string => typeof item === 'string')
    : typeof affected === 'string'
      ? [affected]
      : [];

  return {
    vulnId: pickString(record, ['vuln_id', 'vulnId', 'id']),
    title: pickString(record, ['title', 'name', 'type']),
    severity: pickString(record, ['severity']),
    cvss: pickNumber(record, ['cvss', 'cvssScore', 'cvss_score']),
    affected: affectedList,
    technicalDescription: pickString(record, [
      'technical_description',
      'technicalDescription',
      'description',
    ]),
    nonTechnicalDescription: pickString(record, [
      'non_technical_description',
      'nonTechnicalDescription',
    ]),
    recommendations: asStringArray(record.recommendations),
    references: asStringArray(record.references),
  };
}

function parsePriorityRow(raw: unknown): JsonPriorityFixRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  return {
    priority: (record.priority ?? record.rank) as number | string | undefined,
    finding: pickString(record, ['finding', 'title', 'name']),
    severity: pickString(record, ['severity']),
    cvss: pickNumber(record, ['cvss', 'cvssScore', 'cvss_score']),
    endpoint: pickString(record, ['endpoint', 'affected', 'url', 'resource']),
  };
}

export function parseJsonReport(raw: unknown): JsonReportDocument {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const record = raw as Record<string, unknown>;
  const executiveRaw =
    record.executive_summary ?? record.executiveSummary ?? record.summary_section;
  const vulnsRaw = record.vulnerabilities ?? record.findings ?? record.issues;
  const priorityRaw =
    record.priority_fix_table ??
    record.priorityFixTable ??
    record.priority_fixes ??
    record.priorityFixes ??
    record.top_findings;

  const vulnerabilities = Array.isArray(vulnsRaw)
    ? vulnsRaw.map(parseVulnerability).filter((item): item is JsonVulnerability => !!item)
    : [];

  const priorityFixTable = Array.isArray(priorityRaw)
    ? priorityRaw.map(parsePriorityRow).filter((item): item is JsonPriorityFixRow => !!item)
    : [];

  return {
    executiveSummary: parseExecutiveSummary(executiveRaw),
    vulnerabilities,
    priorityFixTable,
    totalVulnerabilities:
      pickNumber(record, ['total_vulnerabilities', 'totalVulnerabilities']) ??
      vulnerabilities.length,
  };
}

export async function parseJsonReportBlob(blob: Blob): Promise<JsonReportDocument> {
  const text = await blob.text();
  const parsed = JSON.parse(text) as unknown;
  return parseJsonReport(parsed);
}
