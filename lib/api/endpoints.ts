import { client } from './client';
import {
  User,
  UserProfile,
  Target,
  TargetBrowserAuthRequest,
  Scan,
  CreateScanRequest,
  ToolStatus,
  Vulnerability,
  Report,
  GenerateScanReportRequest,
  GenerateReportResponse,
  ReportStatusResponse,
  CreateJiraTicketsResponse,
  JiraProject,
  JiraOAuthInitiateResponse,
  JiraOAuthStatusResponse,
  JiraOAuthDisconnectResponse,
  JiraAccessibleSite,
  JiraProjectSummary,
  JiraConnectionTestResult,
  JiraDeveloperSearchResult,
  VerifyDeveloperRequest,
  JiraDeveloperProfileResponse,
  UpdateDeveloperRoleRequest,
  CreateJiraProjectRequest,
  UpdateJiraProjectRequest,
  LinkJiraProjectRequest,
  EstimatedFinishTime,
  PaginatedResponse,
  AiScanConfigurationRequest,
  AiScanConfigurationResponse,
  AiPostScanReportRequest,
  AiPostScanReportResponse,
  RegisterRequest,
  StartGuidedSetupRequest,
  StartGuidedSetupResponse,
  AnswerGuidedSetupRequest,
  GuidedSetupStepResponse,
  GuidedSetupSessionResponse,
  CreateScanFromRecommendationRequest,
  CreateScanFromRecommendationResponse
} from './types';
import {
  AdminUser,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  PagedResult,
  AdminScanSummary,
  AdminScanDetail,
  AuditLogEntry,
  QueueStatus,
  PlanDefinitionResponse,
  PlanDefinitionBody,
  UserPlanListResponse,
  GrantPlanRequest
} from '../admin/types';
import {
  ActivePlanResponse,
  PlanPublicResponse,
  CheckoutSessionResponse,
  PurchaseExtraScanResponse,
  PurchasePlanResponse
} from '../plans/types';

export const endpoints = {
  auth: {
    register: (data: RegisterRequest) => client.post('/auth/register', data),
    login: (data: any) => client.post('/auth/login', data),
    refresh: (data: { refreshToken: string }) => client.post('/auth/refresh', data),
  },
  users: {
    me: (): Promise<UserProfile> => client.get('/users/me'),
    updateMe: (data: Partial<UserProfile>): Promise<UserProfile> => client.put('/users/me', data),
  },
  targets: {
    create: (url: string): Promise<Target> => client.post('/targets', { url }),
    list: (pageNumber = 1, pageSize = 10): Promise<PaginatedResponse<Target>> => 
      client.get(`/targets?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    setBrowserAuth: (id: string, data: TargetBrowserAuthRequest) => client.put(`/targets/${id}/browser-auth`, data),
    deleteBrowserAuth: (id: string) => client.delete(`/targets/${id}/browser-auth`),
    delete: (id: string) => client.delete(`/targets/${id}`),
  },
  scans: {
    create: (data: CreateScanRequest): Promise<Scan> => client.post('/scans', data),
    createLegacy: (targetId: string, toolNames?: string[]): Promise<Scan> =>
      client.post('/scans', { targetId, toolNames }),
    list: (
      pageNumber = 1,
      pageSize = 10,
      filters?: { status?: string; tool?: string }
    ): Promise<PaginatedResponse<Scan>> => {
      const params = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize),
      });
      if (filters?.status) {
        params.set('status', filters.status);
      }
      if (filters?.tool) {
        params.set('tool', filters.tool);
        // Keep backward compatibility with backends that expect toolName.
        params.set('toolName', filters.tool);
      }
      return client.get(`/scans?${params.toString()}`);
    },
    get: (id: string): Promise<Scan> => client.get(`/scans/${id}`),
    cancel: (id: string) => client.post(`/scans/${id}/cancel`),
    getTools: (id: string): Promise<ToolStatus[]> => client.get(`/scans/${id}/tools`),
    getToolEstimatedFinishTime: (id: string, toolId: string): Promise<EstimatedFinishTime> =>
      client.get(`/scans/${id}/tools/${toolId}/estimated-finish-time`),
    exportPdf: (id: string): Promise<Blob> => client.getBlob(`/scans/${id}/export/pdf`),
    createJiraTickets: (scanId: string): Promise<CreateJiraTicketsResponse> =>
      client.post(`/scans/${scanId}/jira-tickets`),
    getVulnerabilities: (id: string): Promise<Vulnerability[]> => client.get(`/scans/${id}/vulnerabilities`),
  },
  reports: {
    get: (scanId: string): Promise<Report> => client.get(`/reports/${scanId}`),
    export: (scanId: string) => client.get(`/reports/${scanId}/export`),
    generate: (scanId: string, data: GenerateScanReportRequest): Promise<GenerateReportResponse> =>
      client.post(`/reports/${scanId}/generate`, data),
    status: (reportId: string): Promise<ReportStatusResponse> =>
      client.get(`/reports/generated/${encodeURIComponent(reportId)}/status`),
    download: (reportId: string, format: string = 'Pdf'): Promise<Blob> =>
      client.getBlob(`/reports/generated/${encodeURIComponent(reportId)}/download?format=${encodeURIComponent(format)}`),
  },
  ai: {
    suggestScanConfiguration: (data: AiScanConfigurationRequest): Promise<AiScanConfigurationResponse> =>
      client.post('/ai/scan-config', data),
    generatePostScanReport: (scanId: string, data: AiPostScanReportRequest): Promise<AiPostScanReportResponse> =>
      client.post(`/ai/scans/${scanId}/report`, data),
  },
  guidedSetup: {
    start: (data: StartGuidedSetupRequest): Promise<StartGuidedSetupResponse> =>
      client.post('/guided-setup', data),
    get: (sessionId: string): Promise<GuidedSetupSessionResponse> =>
      client.get(`/guided-setup/${sessionId}`),
    answer: (sessionId: string, data: AnswerGuidedSetupRequest): Promise<GuidedSetupStepResponse> =>
      client.post(`/guided-setup/${sessionId}/answer`, data),
    createScan: (
      sessionId: string,
      data: CreateScanFromRecommendationRequest
    ): Promise<CreateScanFromRecommendationResponse> =>
      client.post(`/guided-setup/${sessionId}/create-scan`, data),
  },
  jiraProjects: {
    list: (pageNumber = 1, pageSize = 10): Promise<PaginatedResponse<JiraProject>> =>
      client.get(`/jira-projects?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    create: (data: CreateJiraProjectRequest): Promise<JiraProject> =>
      client.post('/jira-projects', data),
    get: (id: string): Promise<JiraProject> => client.get(`/jira-projects/${id}`),
    update: (id: string, data: UpdateJiraProjectRequest): Promise<JiraProject> =>
      client.put(`/jira-projects/${id}`, data),
    delete: (id: string) => client.delete(`/jira-projects/${id}`),
    testConnection: (id: string) => client.post(`/jira-projects/${id}/test-connection`),
    linkTarget: (id: string, data: LinkJiraProjectRequest) =>
      client.post(`/jira-projects/${id}/link-target`, data),
    unlinkTarget: (targetId: string) => client.delete(`/jira-projects/unlink-target/${targetId}`),
  },
  jiraOAuth: {
    initiate: (): Promise<JiraOAuthInitiateResponse> => client.get('/jira/oauth/initiate'),
    status: (): Promise<JiraOAuthStatusResponse> => client.get('/jira/oauth/status'),
    disconnect: (): Promise<JiraOAuthDisconnectResponse> => client.delete('/jira/oauth/disconnect'),
    sites: (): Promise<JiraAccessibleSite[]> => client.get('/jira/oauth/sites'),
    projects: (cloudId: string): Promise<JiraProjectSummary[]> =>
      client.get(`/jira/oauth/projects?cloudId=${encodeURIComponent(cloudId)}`),
    testConnection: (cloudId: string): Promise<JiraConnectionTestResult> =>
      client.post(`/jira/oauth/test-connection?cloudId=${encodeURIComponent(cloudId)}`),
    searchDevelopers: (cloudId: string, q: string): Promise<JiraDeveloperSearchResult[]> =>
      client.get(`/jira/oauth/developers/search?cloudId=${encodeURIComponent(cloudId)}&q=${encodeURIComponent(q)}`),
    verifyDeveloper: (data: VerifyDeveloperRequest): Promise<JiraDeveloperProfileResponse> =>
      client.post('/jira/oauth/developers/verify', data),
    developers: (): Promise<JiraDeveloperProfileResponse[]> => client.get('/jira/oauth/developers'),
    updateDeveloperRole: (
      jiraAccountId: string,
      data: UpdateDeveloperRoleRequest
    ): Promise<JiraDeveloperProfileResponse> =>
      client.put(`/jira/oauth/developers/${encodeURIComponent(jiraAccountId)}/role`, data),
    removeDeveloper: (jiraAccountId: string, softDelete = true): Promise<void> =>
      client.delete(`/jira/oauth/developers/${encodeURIComponent(jiraAccountId)}?softDelete=${softDelete ? 'true' : 'false'}`),
  },
  plans: {
    list: (): Promise<PlanPublicResponse[]> => client.get('/plans'),
    me: (): Promise<ActivePlanResponse> => client.get('/plans/me'),
  },
  billing: {
    checkoutPlan: (data: { planName: string }): Promise<CheckoutSessionResponse> =>
      client.post('/billing/checkout/plan', data),
    checkoutExtraCredit: (): Promise<CheckoutSessionResponse> =>
      client.post('/billing/checkout/extra-credit'),
    purchasePlanDirect: (data: { planName: string }): Promise<PurchasePlanResponse> =>
      client.post('/billing/purchase-plan', data),
    purchaseExtraScanDirect: (): Promise<PurchaseExtraScanResponse> =>
      client.post('/billing/purchase-extra-scan'),
  },
  admin: {
    users: {
      list: (pageNumber = 1, pageSize = 50): Promise<PagedResult<AdminUser>> =>
        client.get(`/admin/users?pageNumber=${pageNumber}&pageSize=${pageSize}`),
      get: (id: string): Promise<AdminUser> => client.get(`/admin/users/${id}`),
      create: (data: AdminCreateUserRequest): Promise<AdminUser> => client.post('/admin/users', data),
      update: (id: string, data: AdminUpdateUserRequest): Promise<AdminUser> =>
        client.put(`/admin/users/${id}`, data),
      delete: (id: string) => client.delete(`/admin/users/${id}`),
    },
    scans: {
      list: (pageNumber = 1, pageSize = 50): Promise<PagedResult<AdminScanSummary>> =>
        client.get(`/admin/scans?pageNumber=${pageNumber}&pageSize=${pageSize}`),
      get: (id: string): Promise<AdminScanDetail> => client.get(`/admin/scans/${id}`),
      update: (id: string, data: { status?: number | string; failureReason?: string | null }) =>
        client.put(`/admin/scans/${id}`, data),
      delete: (id: string) => client.delete(`/admin/scans/${id}`),
      forceFail: (id: string, reason?: string) =>
        client.post(`/admin/scans/${id}/force-fail`, { reason }),
      cancelAll: () => client.post('/admin/scans/cancel-all'),
      exportPdf: (id: string): Promise<Blob> => client.getBlob(`/admin/scans/${id}/export/pdf`),
    },
    auditLogs: {
      list: (pageNumber = 1, pageSize = 100): Promise<PagedResult<AuditLogEntry>> =>
        client.get(`/admin/audit-logs?pageNumber=${pageNumber}&pageSize=${pageSize}`),
    },
    queue: {
      status: (): Promise<QueueStatus> => client.get('/admin/queue'),
      deleteJob: (vpsJobId: string) => client.delete(`/admin/queue/${vpsJobId}`),
      reorder: (jobId: string, newPosition: number) =>
        client.put('/admin/queue/reorder', { jobId, newPosition }),
    },
    plans: {
      list: (): Promise<PlanDefinitionResponse[]> => client.get('/admin/plans'),
      get: (planName: string): Promise<PlanDefinitionResponse> => client.get(`/admin/plans/${planName}`),
      create: (planName: string, data: PlanDefinitionBody) => client.put(`/admin/plans/${planName}`, data),
      update: (planName: string, data: PlanDefinitionBody) => client.put(`/admin/plans/${planName}`, data),
      delete: (planName: string) => client.delete(`/admin/plans/${planName}`),
      userPlans: {
        list: (pageNumber = 1, pageSize = 50): Promise<PagedResult<UserPlanListResponse>> =>
          client.get(`/admin/plans/user-plans?pageNumber=${pageNumber}&pageSize=${pageSize}`),
        get: (id: string): Promise<UserPlanListResponse> => client.get(`/admin/plans/user-plans/${id}`),
        update: (id: string, data: any) => client.put(`/admin/plans/user-plans/${id}`, data),
        delete: (id: string) => client.delete(`/admin/plans/user-plans/${id}`),
      },
    },
    billing: {
      grantPlan: (data: GrantPlanRequest) => client.post('/admin/billing/grant-plan', data),
    },
  },
};

