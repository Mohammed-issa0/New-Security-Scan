export interface JsonExecutiveSummary {
  headline?: string;
  summary?: string;
  keyRisks?: string[];
  recommendedNextSteps?: string[];
}

export interface JsonVulnerability {
  vulnId?: string;
  title?: string;
  severity?: string;
  cvss?: number;
  affected?: string[];
  technicalDescription?: string;
  nonTechnicalDescription?: string;
  recommendations?: string[];
  references?: string[];
}

export interface JsonPriorityFixRow {
  priority?: number | string;
  finding?: string;
  severity?: string;
  cvss?: number;
  endpoint?: string;
}

export interface JsonReportDocument {
  executiveSummary?: JsonExecutiveSummary;
  vulnerabilities?: JsonVulnerability[];
  priorityFixTable?: JsonPriorityFixRow[];
  priorityFixes?: JsonPriorityFixRow[];
  totalVulnerabilities?: number;
}
