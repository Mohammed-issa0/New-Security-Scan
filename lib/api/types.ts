export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface UserProfile {
  id: string;
  fullName?: string | null;
  email?: string | null;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
  roles?: string[];
}

export interface Target {
  id: string;
  url: string;
  normalizedUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  isActive?: boolean;
  browserAuthConfigured?: boolean;
}

export interface TargetBrowserAuthRequest {
  loginUrl?: string | null;
  targetUrl?: string | null;
  username?: string | null;
  password?: string | null;
  mfa: boolean;
}

export interface Scan {
  id: string;
  targetId: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Canceled';
  toolNames: string[];
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface CreateScanRequest {
  name: string;
  scopeSigned: boolean;
  targets: string[];
  notes?: string;
  tool: 'ffuf' | 'nmap' | 'zap' | 'wpscan' | 'sqlmap';
  targetConfig?: {
    user_agent?: string;
    headers?: Record<string, string>;
    authentication?: {
      token?: string;
      cookies?: { name: string; value: string }[];
    };
  };
  toolConfig?: Record<string, any>;
  extraArgs?: string;
  timeoutMinutes?: number;
}

export interface ToolStatus {
  id?: string;
  toolName: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Canceled' | number;
  startedAt?: string;
  finishedAt?: string;
  startTime?: string;
  endTime?: string;
  logs?: string;
}

export interface JobAheadInfo {
  jobId?: string | null;
  tool?: string | null;
  estimatedDurationSeconds: number;
  maxTimeoutSeconds: number;
}

export interface EstimatedFinishTime {
  queuePosition: number;
  jobsAheadCount: number;
  expectedFinishTimeSeconds: number;
  maximumFinishTimeSeconds: number;
  currentJobEstimatedDurationSeconds: number;
  estimatedFinishAt?: string | null;
  maximumFinishAt?: string | null;
  jobsAhead?: JobAheadInfo[] | null;
}

export interface Vulnerability {
  id: string;
  scanId: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  name?: string;
  type: string;
  description: string;
  affectedResource?: string;
  cvssScore?: number;
  evidence?: string;
  recommendation?: string;
  toolName: string;
  jiraTickets?: JiraTicket[];
}

export interface JiraTicket {
  id: string;
  vulnerabilityId: string;
  ticketKey?: string | null;
  ticketUrl?: string | null;
  assignedRole?: string | null;
  assignedAccountId?: string | null;
  createdAt?: string;
}

export interface JiraTeamRole {
  role: string;
  accountId: string;
}

export interface JiraProject {
  id: string;
  name: string;
  url: string;
  userEmail: string;
  apiTokenMasked?: string;
  projectKey: string;
  teamRoles?: JiraTeamRole[];
  issueType?: string;
  customLabels?: string[];
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  linkedTargetsCount?: number;
}

export interface JiraProjectUpsertRequest {
  name: string;
  url: string;
  user: string;
  token?: string;
  projectKey: string;
  teamRoles?: JiraTeamRole[];
  issueType?: string;
  customLabels?: string[];
}

export interface LinkJiraProjectRequest {
  targetId: string;
}

export interface CreateJiraTicketsResponse {
  createdTickets?: JiraTicket[];
  skippedCount: number;
  failedCount: number;
  errors?: string[];
}

export interface Report {
  id?: string;
  scanId: string;
  totalVulnerabilities?: number;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  infoCount?: number;
  overallRiskScore?: number;
  generatedAt?: string;
  riskScore?: number;
  vulnerabilityCounts?: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
    Info: number;
  };
  summary?: string;
}

export interface AiScanConfigurationRequest {
  scanId?: string | null;
  planId: string;
  userPrompt: string;
  targetUrl: string;
  targetType: 'webapp' | 'api' | 'network' | string;
  timeBudget?: string | number;
}

export interface AiScanConfigurationResponse {
  scanId?: string;
  ai?: string;
  recommendedToolNames?: string[];
  recommendedTools?: string[];
  recommendedTool?: string;
  timeoutMinutes?: number;
  notes?: string;
  targetType?: string;
  raw?: unknown;
  [key: string]: unknown;
}

export interface AiPostScanReportRequest {
  planId?: string;
  verbosity: 'brief' | 'detailed' | 'comprehensive' | string;
  createJiraTickets: boolean;
}

export interface AiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model?: string;
  durationSeconds?: number;
  [key: string]: unknown;
}

export interface AiPostScanReportResponse {
  scanId?: string;
  ai?: string;
  report?: string;
  summary?: string;
  jiraResult?: CreateJiraTicketsResponse;
  jiraTickets?: JiraTicket[];
  tokenUsage?: AiTokenUsage;
  raw?: unknown;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages?: number;
}

