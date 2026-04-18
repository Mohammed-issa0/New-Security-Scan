export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminUser {
  id: string;
  fullName?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  roles?: string[];
}

export interface AdminCreateUserRequest {
  email?: string | null;
  password?: string | null;
  fullName?: string | null;
  isActive?: boolean;
}

export interface AdminUpdateUserRequest {
  email?: string | null;
  fullName?: string | null;
  isActive?: boolean | null;
  password?: string | null;
}

export interface AdminScanSummary {
  id: string;
  targetId?: string | null;
  status?: string;
  requestedAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  requestedByUserId?: string;
  planName?: string | null;
}

export interface AdminScanDetail extends AdminScanSummary {
  failureReason?: string | null;
  terminationReason?: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  action?: string | null;
  entityName?: string | null;
  entityId?: string | null;
  timestamp?: string;
  ipAddress?: string | null;
  user?: AdminUser;
}

export interface QueueItem {
  vpsJobId?: string | null;
  scanToolId: string;
  scanId: string;
  userId: string;
  userEmail?: string | null;
  toolName?: string | null;
  queuePosition: number;
  jobsAheadCount: number;
  expectedFinishTimeSeconds: number;
  maximumFinishTimeSeconds: number;
  estimatedFinishAt?: string | null;
  maximumFinishAt?: string | null;
  currentJobEstimatedDurationSeconds?: number;
  error?: string | null;
}

export interface QueueStatus {
  queueSize: number;
  jobs?: QueueItem[];
}

export interface PlanDefinitionResponse {
  planName?: string | null;
  definitionJson?: string | null;
  updatedAt?: string;
  updatedByUserId?: string | null;
}

export interface PlanDefinitionBody {
  plan_name?: string | null;
  max_concurrent_scans?: number;
  [key: string]: unknown;
}

export interface UserPlanListResponse {
  id: string;
  userId: string;
  userEmail?: string | null;
  userFullName?: string | null;
  planName?: string | null;
  status?: string | number;
  purchasedAt?: string;
  expiresAt?: string;
  includedCredits?: number;
  includedCreditsUsed?: number;
  extraPurchaseCount?: number;
}

export interface UserPlanDetailResponse extends UserPlanListResponse {
  replacedAt?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
}

export interface UpdateUserPlanRequest {
  status?: number;
  expiresAt?: string | null;
  includedCredits?: number | null;
  includedCreditsUsed?: number | null;
  extraPurchaseCount?: number | null;
}

export interface GrantPlanRequest {
  userId: string;
  planName?: string | null;
}
