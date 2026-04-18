import { endpoints } from '../api/endpoints';
import { ApiRequestError, client } from '../api/client';
import type {
  CreateScanRequest,
  TargetBrowserAuthRequest,
  AiScanConfigurationRequest,
  AiScanConfigurationResponse,
  AiPostScanReportRequest,
  AiPostScanReportResponse,
  GenerateScanReportRequest,
  GenerateReportResponse,
  ReportStatusResponse,
} from '../api/types';

const isTransientGatewayError = (error: unknown) =>
  error instanceof ApiRequestError && (error.status === 502 || error.status === 503 || error.status === 504);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const scansService = {
  // Targets
  async createTarget(url: string) {
    return endpoints.targets.create(url);
  },
  async getTargets(page = 1, size = 10) {
    return endpoints.targets.list(page, size);
  },
  async setTargetBrowserAuth(id: string, data: TargetBrowserAuthRequest) {
    return endpoints.targets.setBrowserAuth(id, data);
  },
  async deleteTargetBrowserAuth(id: string) {
    return endpoints.targets.deleteBrowserAuth(id);
  },
  async deleteTarget(id: string) {
    return endpoints.targets.delete(id);
  },

  // Scans
  async createScan(data: CreateScanRequest) {
    return endpoints.scans.create(data);
  },
  async createScanLegacy(targetId: string, toolNames?: string[]) {
    return endpoints.scans.createLegacy(targetId, toolNames);
  },
  async getScans(page = 1, size = 10, filters?: { status?: string; tool?: string }) {
    return endpoints.scans.list(page, size, filters);
  },
  async getScanDetails(id: string) {
    return endpoints.scans.get(id);
  },
  async cancelScan(id: string) {
    return endpoints.scans.cancel(id);
  },
  async getScanTools(id: string) {
    return endpoints.scans.getTools(id);
  },
  async getToolEstimatedFinishTime(id: string, toolId: string) {
    return endpoints.scans.getToolEstimatedFinishTime(id, toolId);
  },
  async exportScanPdf(id: string) {
    return endpoints.scans.exportPdf(id);
  },
  async createJiraTickets(scanId: string) {
    return endpoints.scans.createJiraTickets(scanId);
  },
  async getScanVulnerabilities(id: string) {
    return endpoints.scans.getVulnerabilities(id);
  },

  // Reports
  async getReport(scanId: string) {
    return endpoints.reports.get(scanId);
  },
  async generateReport(scanId: string, data: GenerateScanReportRequest) {
    return endpoints.reports.generate(scanId, data);
  },
  async getGeneratedReportStatus(reportId: string) {
    return endpoints.reports.status(reportId);
  },
  async downloadGeneratedReport(reportId: string, format: string = 'Pdf') {
    return endpoints.reports.download(reportId, format);
  },

  // AI
  async suggestScanConfiguration(data: AiScanConfigurationRequest) {
    const postWithRetry = async (path: string) => {
      try {
        return await client.post(path, data) as AiScanConfigurationResponse;
      } catch (error) {
        if (!isTransientGatewayError(error)) {
          throw error;
        }

        await wait(700);
        return await client.post(path, data) as AiScanConfigurationResponse;
      }
    };

    try {
      return await postWithRetry('/ai/scan-config');
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 404) {
        throw error;
      }

      const fallbackPaths = [
        '/ai/scans/configuration',
        '/scans/ai/configuration',
        '/scans/assistant/configuration',
        '/scans/assistant/configure',
      ];

      for (const path of fallbackPaths) {
        try {
          return await postWithRetry(path);
        } catch (fallbackError) {
          if (!(fallbackError instanceof ApiRequestError) || fallbackError.status !== 404) {
            throw fallbackError;
          }
        }
      }

      throw error;
    }
  },
  async generatePostScanReport(scanId: string, data: AiPostScanReportRequest) {
    try {
      return await endpoints.ai.generatePostScanReport(scanId, data);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 404) {
        throw error;
      }

      const fallbackPaths = [
        `/reports/${scanId}/ai`,
        `/scans/${scanId}/ai-report`,
      ];

      for (const path of fallbackPaths) {
        try {
          return await client.post(path, data) as AiPostScanReportResponse;
        } catch (fallbackError) {
          if (!(fallbackError instanceof ApiRequestError) || fallbackError.status !== 404) {
            throw fallbackError;
          }
        }
      }

      throw error;
    }
  }
};

