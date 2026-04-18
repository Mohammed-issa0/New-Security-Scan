import { endpoints } from '@/lib/api/endpoints';

export const jiraOAuthService = {
  initiate() {
    return endpoints.jiraOAuth.initiate();
  },
  status() {
    return endpoints.jiraOAuth.status();
  },
  disconnect() {
    return endpoints.jiraOAuth.disconnect();
  },
  sites() {
    return endpoints.jiraOAuth.sites();
  },
  projects(cloudId: string) {
    return endpoints.jiraOAuth.projects(cloudId);
  },
  testConnection(cloudId: string) {
    return endpoints.jiraOAuth.testConnection(cloudId);
  },
  searchDevelopers(cloudId: string, q: string) {
    return endpoints.jiraOAuth.searchDevelopers(cloudId, q);
  },
  verifyDeveloper(data: { cloudId: string; jiraAccountId: string; customRole?: string }) {
    return endpoints.jiraOAuth.verifyDeveloper(data);
  },
  developers() {
    return endpoints.jiraOAuth.developers();
  },
  updateDeveloperRole(jiraAccountId: string, customRole: string) {
    return endpoints.jiraOAuth.updateDeveloperRole(jiraAccountId, { customRole });
  },
  removeDeveloper(jiraAccountId: string, softDelete = true) {
    return endpoints.jiraOAuth.removeDeveloper(jiraAccountId, softDelete);
  },
};
