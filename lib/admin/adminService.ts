import { endpoints } from '../api/endpoints';
import {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  PlanDefinitionBody,
  GrantPlanRequest,
  UpdateUserPlanRequest,
  UserPlanDetailResponse
} from './types';

export const adminService = {
  users: {
    list(page = 1, size = 50) {
      return endpoints.admin.users.list(page, size);
    },
    get(id: string) {
      return endpoints.admin.users.get(id);
    },
    create(data: AdminCreateUserRequest) {
      return endpoints.admin.users.create(data);
    },
    update(id: string, data: AdminUpdateUserRequest) {
      return endpoints.admin.users.update(id, data);
    },
    delete(id: string) {
      return endpoints.admin.users.delete(id);
    },
  },
  scans: {
    list(page = 1, size = 50) {
      return endpoints.admin.scans.list(page, size);
    },
    get(id: string) {
      return endpoints.admin.scans.get(id);
    },
    update(id: string, data: { status?: number | string; failureReason?: string | null }) {
      return endpoints.admin.scans.update(id, data);
    },
    delete(id: string) {
      return endpoints.admin.scans.delete(id);
    },
    forceFail(id: string, reason?: string) {
      return endpoints.admin.scans.forceFail(id, reason);
    },
    cancelAll() {
      return endpoints.admin.scans.cancelAll();
    },
    exportPdf(id: string) {
      return endpoints.admin.scans.exportPdf(id);
    },
  },
  auditLogs: {
    list(page = 1, size = 100) {
      return endpoints.admin.auditLogs.list(page, size);
    },
  },
  queue: {
    status() {
      return endpoints.admin.queue.status();
    },
    deleteJob(vpsJobId: string) {
      return endpoints.admin.queue.deleteJob(vpsJobId);
    },
    reorder(jobId: string, newPosition: number) {
      return endpoints.admin.queue.reorder(jobId, newPosition);
    },
  },
  plans: {
    list() {
      return endpoints.admin.plans.list();
    },
    get(planName: string) {
      return endpoints.admin.plans.get(planName);
    },
    create(planName: string, data: PlanDefinitionBody) {
      return endpoints.admin.plans.create(planName, data);
    },
    update(planName: string, data: PlanDefinitionBody) {
      return endpoints.admin.plans.update(planName, data);
    },
    delete(planName: string) {
      return endpoints.admin.plans.delete(planName);
    },
    userPlans: {
      list(page = 1, size = 50) {
        return endpoints.admin.plans.userPlans.list(page, size);
      },
      get(id: string): Promise<UserPlanDetailResponse> {
        return endpoints.admin.plans.userPlans.get(id);
      },
      update(id: string, data: UpdateUserPlanRequest): Promise<UserPlanDetailResponse> {
        return endpoints.admin.plans.userPlans.update(id, data);
      },
      delete(id: string) {
        return endpoints.admin.plans.userPlans.delete(id);
      },
    },
  },
  billing: {
    grantPlan(data: GrantPlanRequest) {
      return endpoints.admin.billing.grantPlan(data);
    },
  },
};
