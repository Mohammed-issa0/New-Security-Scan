import { ApiRequestError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ActivePlanResponse } from '@/lib/plans/types';

export const plansService = {
  listPublic() {
    return endpoints.plans.list();
  },
  async getActivePlan(): Promise<ActivePlanResponse | null> {
    try {
      return await endpoints.plans.me();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  checkoutPlan(planName: string) {
    return endpoints.billing.checkoutPlan({ planName });
  },
  checkoutExtraCredit() {
    return endpoints.billing.checkoutExtraCredit();
  },
  purchasePlanDirect(planName: string) {
    return endpoints.billing.purchasePlanDirect({ planName });
  },
  purchaseExtraScanDirect() {
    return endpoints.billing.purchaseExtraScanDirect();
  },
};
