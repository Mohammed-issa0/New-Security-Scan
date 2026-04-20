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

export interface RegisterRequest {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
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
  tool: 'ffuf' | 'nmap' | 'zap' | 'wpscan' | 'sqlmap' | 'xss' | 'ssl';
  targetConfig?: {
    userAgent?: string;
    headers?: Record<string, string>;
    authentication?: {
      token?: string;
      cookies?: { name: string; value: string }[];
    };
  };
  toolConfig?: Record<string, any>;
  toolDepths?: Record<string, string>;
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

export interface JiraOAuthInitiateResponse {
  authorizationUrl: string;
  alreadyConnected: boolean;
}

export interface JiraOAuthSite {
  cloudId: string;
  name: string;
  url: string;
  avatarUrl?: string | null;
}

export interface JiraAccessibleSite {
  cloudId: string;
  name: string;
  url: string;
  avatarUrl?: string | null;
}

export interface JiraProjectSummary {
  key: string;
  name: string;
  projectTypeKey?: string | null;
  avatarUrl?: string | null;
}

export interface JiraConnectionTestResult {
  success: boolean;
  cloudId?: string;
  siteName?: string | null;
  jiraVersion?: string | null;
  errorMessage?: string | null;
}

export interface JiraDeveloperSearchResult {
  jiraAccountId: string;
  jiraDisplayName: string;
  jiraEmail?: string | null;
  accountType?: string | null;
  avatarUrl?: string | null;
  customRole?: string | null;
  isMapped?: boolean;
  isDeleted?: boolean;
  lastVerifiedAt?: string | null;
}

export interface VerifyDeveloperRequest {
  cloudId: string;
  jiraAccountId: string;
  customRole?: string;
}

export interface UpdateDeveloperRoleRequest {
  customRole: string;
}

export interface JiraDeveloperProfileResponse {
  jiraAccountId: string;
  jiraDisplayName: string;
  jiraEmail?: string | null;
  customRole?: string | null;
  accountType?: string | null;
  lastVerifiedAt?: string | null;
  isDeleted?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface JiraOAuthStatusResponse {
  connected: boolean;
  atlassianEmail?: string | null;
  atlassianDisplayName?: string | null;
  atlassianAccountId?: string | null;
  sites?: JiraOAuthSite[] | null;
  connectedAt?: string | null;
}

export interface JiraOAuthDisconnectResponse {
  message?: string;
}

export interface CreateJiraProjectRequest {
  name: string;
  jiraBaseUrl: string;
  jiraUser: string;
  jiraAuthToken: string;
  jiraProjectKey: string;
  jiraAuthTokenType?: string;
  teamRoles?: JiraTeamRole[];
  issueType?: string;
  customLabels?: string[];
}

export interface UpdateJiraProjectRequest {
  name?: string;
  jiraBaseUrl?: string;
  jiraUser?: string;
  jiraAuthToken?: string;
  jiraProjectKey?: string;
  jiraAuthTokenType?: string;
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

export interface GenerateScanReportRequest {
  reportMode?: string | null;
  outputFormats?: string[] | null;
  idempotencyKey?: string | null;
}

export interface GenerateReportResponse {
  reportId?: string | null;
  jobId?: string | null;
  status?: string | null;
  idempotencyKey?: string | null;
}

export interface ReportStatusResponse {
  reportId?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  errorMessage?: string | null;
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

export interface QuestionChoice {
  value?: string | null;
  label?: string | null;
}

export interface GuidedSetupQuestion {
  question_id: number;
  text?: string | null;
  hint?: string | null;
  input_type?: string | null;
  choices?: QuestionChoice[] | null;
}

export interface ToolDepth {
  tool_id?: string | null;
  depth?: string | null;
}

export interface ScanRecommendation {
  plain_summary?: string | null;
  what_we_check?: string[] | null;
  estimated_minutes: number;
  confidence?: string | null;
  tools_with_depths?: ToolDepth[] | null;
}

export interface StartGuidedSetupRequest {
  targetUrl?: string | null;
}

export interface StartGuidedSetupResponse {
  sessionId: string;
  question?: GuidedSetupQuestion | null;
  expiresAt: string;
}

export interface AnswerGuidedSetupRequest {
  questionId: number;
  questionText?: string | null;
  answer?: string | null;
}

export type GuidedSetupStepType = 'question' | 'recommendation';

export interface GuidedSetupStepResponse {
  sessionId: string;
  stepType?: GuidedSetupStepType | null;
  question?: GuidedSetupQuestion | null;
  recommendation?: ScanRecommendation | null;
}

export interface GuidedSetupAnswerRecord {
  question_id: number;
  question_text?: string | null;
  answer?: string | null;
}

export interface GuidedSetupSessionResponse {
  sessionId: string;
  status?: string | null;
  targetUrl?: string | null;
  answers?: GuidedSetupAnswerRecord[] | null;
  recommendation?: ScanRecommendation | null;
  createdAt: string;
  expiresAt: string;
}

export interface CreateScanFromRecommendationRequest {
  targetUrl?: string | null;
}

export interface CreateScanFromRecommendationResponse {
  scanId: string;
  targetUrl?: string | null;
  tools?: string[] | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages?: number;
}

