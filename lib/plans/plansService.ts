import { endpoints } from '@/lib/api/endpoints';

export const plansService = {
  listPublic() {
    return endpoints.plans.list();
  },
  getActivePlan() {
    return endpoints.plans.me();
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
