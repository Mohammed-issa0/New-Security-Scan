import { endpoints } from '@/lib/api/endpoints';
import type { JiraProjectUpsertRequest } from '@/lib/api/types';

export const jiraProjectsService = {
  list(page = 1, size = 10) {
    return endpoints.jiraProjects.list(page, size);
  },
  create(data: JiraProjectUpsertRequest) {
    return endpoints.jiraProjects.create(data);
  },
  get(id: string) {
    return endpoints.jiraProjects.get(id);
  },
  update(id: string, data: JiraProjectUpsertRequest) {
    return endpoints.jiraProjects.update(id, data);
  },
  delete(id: string) {
    return endpoints.jiraProjects.delete(id);
  },
  testConnection(id: string) {
    return endpoints.jiraProjects.testConnection(id);
  },
  linkTarget(projectId: string, targetId: string) {
    return endpoints.jiraProjects.linkTarget(projectId, { targetId });
  },
  unlinkTarget(targetId: string) {
    return endpoints.jiraProjects.unlinkTarget(targetId);
  },
};
