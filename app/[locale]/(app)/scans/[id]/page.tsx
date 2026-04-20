'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { scansService } from '@/lib/scans/scansService';
import { plansService } from '@/lib/plans/plansService';
import { useParams } from 'next/navigation';
import type {
  CreateJiraTicketsResponse,
  EstimatedFinishTime,
  Scan,
  ToolStatus,
  AiPostScanReportResponse,
} from '@/lib/api/types';
import { ApiRequestError } from '@/lib/api/client';
import { 
  Shield, Clock, AlertTriangle, CheckCircle,
  Terminal, BarChart, AlertCircle, PlayCircle, X, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { PanelEmptyState, PanelErrorState, PanelLoadingState } from '@/components/common/AsyncStates';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

type DetailsTab = 'overview' | 'tools' | 'vulnerabilities' | 'report';

const statusClassMap: Record<string, string> = {
  Pending: 'border border-status-warning/30 bg-status-warning/14 text-status-warning',
  Running: 'border border-cyan-300/30 bg-cyan-400/14 text-cyan-200',
  Completed: 'border border-status-success/28 bg-status-success/14 text-status-success',
  Failed: 'border border-status-danger/30 bg-status-danger/14 text-status-danger',
  Canceled: 'border border-white/14 bg-white/8 text-text-secondary',
  Unknown: 'border border-white/14 bg-white/8 text-text-secondary',
};

const toolStatusClassMap: Record<string, string> = {
  Pending: 'border border-white/14 bg-white/8 text-text-secondary',
  Running: 'animate-pulse border border-cyan-300/30 bg-cyan-400/14 text-cyan-200',
  Completed: 'border border-status-success/28 bg-status-success/14 text-status-success',
  Failed: 'border border-status-danger/30 bg-status-danger/14 text-status-danger',
  Canceled: 'border border-white/14 bg-white/8 text-text-secondary',
};

const normalizeToolStatus = (value: ToolStatus['status'] | undefined) => {
  if (typeof value === 'string') {
    return value;
  }

  const map: Record<number, 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Canceled'> = {
    1: 'Pending',
    2: 'Running',
    3: 'Completed',
    4: 'Failed',
    5: 'Canceled',
  };

  return typeof value === 'number' ? map[value] || 'Pending' : 'Pending';
};

const formatDuration = (seconds: number | null, t: ReturnType<typeof useTranslations>) => {
  if (seconds === null) {
    return '-';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return t('durationValue', { seconds: secs });
  }
  return `${mins}m ${secs}s`;
};

const normalizeStatus = (value: unknown): Scan['status'] | 'Unknown' => {
  if (typeof value === 'string') {
    if (['Pending', 'Running', 'Completed', 'Failed', 'Canceled'].includes(value)) {
      return value as Scan['status'];
    }
    return 'Unknown';
  }
  if (typeof value === 'number') {
    const map: Record<number, Scan['status']> = {
      1: 'Pending',
      2: 'Running',
      3: 'Completed',
      4: 'Failed',
      5: 'Canceled',
    };
    return map[value] || 'Unknown';
  }
  return 'Unknown';
};

const extractAiReportText = (payload: AiPostScanReportResponse | null, fallbackText: string) => {
  if (!payload) {
    return fallbackText;
  }

  const text = payload.ai || payload.report || payload.summary;
  if (typeof text === 'string' && text.trim().length > 0) {
    return text;
  }

  if (text && typeof text === 'object') {
    try {
      return JSON.stringify(text, null, 2);
    } catch {
      return String(text);
    }
  }

  return fallbackText;
};

export default function ScanDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const td = useTranslations('landing.scans.details');
  const tCommon = useTranslations('common.states');
  const queryClient = useQueryClient();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<DetailsTab>('overview');
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [jiraResult, setJiraResult] = useState<CreateJiraTicketsResponse | null>(null);
  const [aiVerbosity, setAiVerbosity] = useState<'brief' | 'detailed' | 'comprehensive'>('detailed');
  const [aiCreateJiraTickets, setAiCreateJiraTickets] = useState(false);
  const [aiPostScanReport, setAiPostScanReport] = useState<AiPostScanReportResponse | null>(null);

  const { data: scan, isLoading: scanLoading, isError: scanError, error: scanErrorObj, refetch: refetchScan } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => scansService.getScanDetails(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'Pending' || status === 'Running' ? 3000 : false;
    },
  });

  const { data: tools, isLoading: toolsLoading } = useQuery({
    queryKey: ['scan-tools', id],
    queryFn: () => scansService.getScanTools(id),
    enabled: !!scan,
    refetchInterval: (query) => {
      return scan?.status === 'Running' ? 3000 : false;
    },
  });

  const { data: vulnerabilities } = useQuery({
    queryKey: ['scan-vulnerabilities', id],
    queryFn: () => scansService.getScanVulnerabilities(id),
    enabled: !!scan,
  });

  const { data: report } = useQuery({
    queryKey: ['scan-report', id],
    queryFn: () => scansService.getReport(id),
    enabled: !!scan && scan.status === 'Completed',
  });

  const { data: activePlan } = useQuery({
    queryKey: ['plans-active'],
    queryFn: () => plansService.getActivePlan(),
  });

  const cancelMutation = useMutation({
    mutationFn: () => scansService.cancelScan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan', id] });
      queryClient.invalidateQueries({ queryKey: ['scan-tools', id] });
      queryClient.invalidateQueries({ queryKey: ['scan-vulnerabilities', id] });
      queryClient.invalidateQueries({ queryKey: ['scan-report', id] });
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      setIsCancelDialogOpen(false);
      toast.success(td('cancelRequested'));
    },
    onError: (error: any) => {
      toast.error(error.message || td('cancelError'));
    },
  });

  const createJiraTicketsMutation = useMutation({
    mutationFn: () => scansService.createJiraTickets(id),
    onSuccess: async (result) => {
      setJiraResult(result);
      await queryClient.invalidateQueries({ queryKey: ['scan-vulnerabilities', id] });

      const created = result.createdTickets?.length ?? 0;
      toast.success(td('jira.toastSuccess', {
        created,
        skipped: result.skippedCount,
        failed: result.failedCount,
      }));
    },
    onError: (error: any) => {
      toast.error(error?.message || td('jira.toastError'));
    },
  });

  const generateAiReportMutation = useMutation({
    mutationFn: () => {
      const normalizedPlanId = activePlan?.planName?.trim().toLowerCase();

      return scansService.generatePostScanReport(id, {
        planId: normalizedPlanId,
        verbosity: aiVerbosity,
        createJiraTickets: aiCreateJiraTickets,
      });
    },
    onSuccess: async (result) => {
      setAiPostScanReport(result);

      if (aiCreateJiraTickets && result.jiraResult) {
        setJiraResult(result.jiraResult);
        await queryClient.invalidateQueries({ queryKey: ['scan-vulnerabilities', id] });
      } else if (aiCreateJiraTickets && Array.isArray(result.jiraTickets)) {
        setJiraResult({
          createdTickets: result.jiraTickets,
          skippedCount: 0,
          failedCount: 0,
          errors: [],
        });
        await queryClient.invalidateQueries({ queryKey: ['scan-vulnerabilities', id] });
      }

      toast.success(td('aiReport.toastSuccess'));
    },
    onError: (error: any) => {
      if (error instanceof ApiRequestError) {
        const backendMessage = (error.data?.error || '').toLowerCase();
        const isAiDisabled =
          error.status === 501 ||
          (error.status === 404 && (
            backendMessage.includes('ai') ||
            backendMessage.includes('not enabled') ||
            backendMessage.includes('disabled')
          ));

        if (isAiDisabled) {
          toast.error(td('aiReport.notEnabled'));
          return;
        }
      }

      toast.error(error?.message || td('aiReport.toastError'));
    },
  });

  const etaQueries = useQueries({
    queries: (tools || [])
      .map((tool) => {
        const toolStatus = normalizeToolStatus(tool.status);
        const isToolPendingOrRunning = toolStatus === 'Pending' || toolStatus === 'Running';
        if (!tool.id || !scan || !isToolPendingOrRunning) {
          return null;
        }
        return {
          queryKey: ['scan-tool-eta', id, tool.id],
          queryFn: async () => {
            try {
              return await scansService.getToolEstimatedFinishTime(id, tool.id!);
            } catch (error) {
              if (error instanceof ApiRequestError && error.status === 404) {
                return null;
              }
              throw error;
            }
          },
          enabled: scan.status === 'Pending' || scan.status === 'Running',
          refetchInterval: 30000,
          staleTime: 10000,
        };
      })
      .filter((query): query is NonNullable<typeof query> => !!query),
  });

  if (scanLoading) {
    return (
      <PanelLoadingState title={tCommon('loading')} />
    );
  }

  if (scanError) {
    return (
      <PanelErrorState
        title={scanErrorObj instanceof Error ? scanErrorObj.message : tCommon('error')}
        retryLabel={tCommon('retry')}
        onRetry={() => refetchScan()}
      />
    );
  }

  if (!scan) {
    return <PanelEmptyState title={td('notFound')} />;
  }

  const normalizedStatus = normalizeStatus(scan.status);
  const statusKey = ['pending', 'running', 'completed', 'failed', 'canceled'].includes(normalizedStatus.toLowerCase())
    ? normalizedStatus.toLowerCase()
    : 'unknown';

  const toolNames = scan.toolNames && scan.toolNames.length > 0
    ? scan.toolNames
    : (tools || [])
        .map((tool) => tool.toolName)
        .filter((toolName): toolName is string => !!toolName);

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleString(locale) : '-';

  const durationSeconds = scan.startedAt && scan.finishedAt
    ? Math.round((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)
    : null;

  const canCancel = normalizedStatus === 'Pending' || normalizedStatus === 'Running';

  const toolRows: Array<{
    id?: string;
    toolName: string;
    status: ToolStatus['status'];
    startTime?: string;
    endTime?: string;
    logs?: string;
  }> = (() => {
    const fromTools = (tools || []).map((tool) => ({
      id: tool.id,
      toolName: tool.toolName,
      status: normalizeToolStatus(tool.status),
      startTime: tool.startedAt || tool.startTime,
      endTime: tool.finishedAt || tool.endTime,
      logs: tool.logs,
    }));
    if (fromTools.length > 0) {
      return fromTools;
    }
    return toolNames.map((toolName) => ({ toolName, status: 'Pending' as ToolStatus['status'] }));
  })();

  const etaMap = etaQueries.reduce<Record<string, EstimatedFinishTime | null>>((acc, query, index) => {
    const sourceTool = (tools || []).filter((tool) => {
      const toolStatus = normalizeToolStatus(tool.status);
      return tool.id && (toolStatus === 'Pending' || toolStatus === 'Running');
    })[index];
    if (sourceTool?.id) {
      acc[sourceTool.id] = query.data ?? null;
    }
    return acc;
  }, {});

  const hasAnyEta = Object.values(etaMap).some((item) => !!item);

  const nextEta = Object.values(etaMap)
    .filter((item): item is EstimatedFinishTime => !!item?.estimatedFinishAt)
    .sort((a, b) => new Date(a.estimatedFinishAt || 0).getTime() - new Date(b.estimatedFinishAt || 0).getTime())[0];

  const runningOrPendingToolCount = toolRows.filter((tool) => tool.status === 'Pending' || tool.status === 'Running').length;
  const aiOutput = extractAiReportText(aiPostScanReport, td('aiReport.emptyOutput'));
  const promptTokens = aiPostScanReport?.tokenUsage?.promptTokens ?? aiPostScanReport?.tokenUsage?.inputTokens;
  const completionTokens = aiPostScanReport?.tokenUsage?.completionTokens ?? aiPostScanReport?.tokenUsage?.outputTokens;
  const tokenModel = aiPostScanReport?.tokenUsage?.model;
  const tokenDuration = aiPostScanReport?.tokenUsage?.durationSeconds;

  const tabs: Array<{ key: DetailsTab; label: string }> = [
    { key: 'overview', label: td('tabs.overview') },
    { key: 'tools', label: td('tabs.tools') },
    { key: 'vulnerabilities', label: td('tabs.vulnerabilities') },
    { key: 'report', label: td('tabs.report') },
  ];

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{td('eyebrow')}</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-text-primary">
              <Shield className="h-7 w-7 text-cyan-300" />
              {td('title', { id: scan.id.slice(0, 8) })}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{td('statusLabel')}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[normalizedStatus] || statusClassMap.Unknown}`}>
                {td(`status.${statusKey}`)}
              </span>
              <span className="text-xs text-text-muted">•</span>
              <span>{td('requestedAt', { date: formatDate(scan.requestedAt) })}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/scans/${id}/report`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/6 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/10"
            >
              <BarChart className="h-4 w-4" />
              {td('openReportPage')}
            </Link>
            <button
              type="button"
              onClick={() => createJiraTicketsMutation.mutate()}
              disabled={createJiraTicketsMutation.isPending || normalizedStatus !== 'Completed'}
              className="inline-flex items-center gap-2 rounded-lg border border-status-success/28 bg-status-success/12 px-4 py-2 text-sm font-medium text-status-success hover:bg-status-success/18 disabled:cursor-not-allowed disabled:opacity-50"
              title={normalizedStatus !== 'Completed' ? td('jira.availableWhenCompleted') : undefined}
            >
              {createJiraTicketsMutation.isPending ? td('jira.creating') : td('jira.createButton')}
            </button>
            <button
              type="button"
              onClick={() => canCancel && setIsCancelDialogOpen(true)}
              disabled={!canCancel || cancelMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-status-danger/30 bg-status-danger/12 px-4 py-2 text-sm font-medium text-status-danger hover:bg-status-danger/18 disabled:cursor-not-allowed disabled:opacity-50"
              title={!canCancel ? td('cancelNotAllowed') : undefined}
            >
              {cancelMutation.isPending ? td('canceling') : td('cancelButton')}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={`hero-${tab.key}`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-cyan-400/16 text-cyan-200 border border-cyan-300/30'
                  : 'border border-white/14 bg-white/6 text-text-secondary hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="app-panel rounded-2xl p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{td('eta.title')}</p>
            <p className="mt-1 text-sm text-text-secondary">{td('eta.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2 text-center">
              <p className="text-xs text-text-muted">{td('eta.activeTools')}</p>
              <p className="font-semibold text-text-primary">{runningOrPendingToolCount}</p>
            </div>
            <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2 text-center">
              <p className="text-xs text-text-muted">{td('eta.jobsAhead')}</p>
              <p className="font-semibold text-text-primary">{nextEta?.jobsAheadCount ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2 text-center">
              <p className="text-xs text-text-muted">{td('eta.nextEta')}</p>
              <p className="font-semibold text-text-primary">
                {nextEta?.estimatedFinishAt ? formatDate(nextEta.estimatedFinishAt) : td('eta.unavailable')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/14 bg-white/6 p-4 shadow-sm">
          <div className="mb-1 flex items-center text-sm text-text-secondary">
            <Clock className="h-4 w-4 mr-2" />
            {td('durationLabel')}
          </div>
          <div className="text-lg font-semibold">
            {durationSeconds !== null
              ? formatDuration(durationSeconds, td)
              : scan.status === 'Running'
                ? td('running')
                : '-'}
          </div>
        </div>
        <div className="rounded-xl border border-white/14 bg-white/6 p-4 shadow-sm">
          <div className="mb-1 flex items-center text-sm text-text-secondary">
            <PlayCircle className="h-4 w-4 mr-2" />
            {td('startedAtLabel')}
          </div>
          <div className="text-lg font-semibold">
            {formatDate(scan.startedAt)}
          </div>
        </div>
        <div className="rounded-xl border border-white/14 bg-white/6 p-4 shadow-sm">
          <div className="mb-1 flex items-center text-sm text-text-secondary">
            <CheckCircle className="h-4 w-4 mr-2" />
            {td('finishedAtLabel')}
          </div>
          <div className="text-lg font-semibold">
            {formatDate(scan.finishedAt)}
          </div>
        </div>
        <div className="rounded-xl border border-white/14 bg-white/6 p-4 shadow-sm">
          <div className="mb-1 flex items-center text-sm text-text-secondary">
            <AlertCircle className="h-4 w-4 mr-2" />
            {td('vulnerabilitiesCountLabel')}
          </div>
          <div className="text-lg font-semibold text-text-primary">
            {vulnerabilities?.length || 0}
          </div>
        </div>
      </div>

      {report && (
        <div className="rounded-xl border border-white/14 bg-white/6 p-4 shadow-sm">
          <div className="mb-1 flex items-center text-sm text-text-secondary">
            <BarChart className="h-4 w-4 mr-2" />
            {td('riskScoreLabel')}
          </div>
          <div className="text-2xl font-semibold text-status-danger">
            {report.riskScore}/10
          </div>
        </div>
      )}

      {(normalizedStatus === 'Failed' || normalizedStatus === 'Canceled') && (
        <div className="rounded-xl border border-status-danger/30 bg-status-danger/14 p-4 text-status-danger">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4" />
            {normalizedStatus === 'Failed' ? td('failureDetailsTitle') : td('terminationDetailsTitle')}
          </div>
          <p className="text-sm">{scan.error || td('failureDetailsEmpty')}</p>
        </div>
      )}

      {jiraResult && (
        <div className="rounded-xl border border-status-success/30 bg-status-success/12 p-4">
          <h3 className="mb-3 text-sm font-semibold text-status-success">{td('jira.summaryTitle')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/14 bg-white/8 p-3 text-center">
              <p className="text-xs text-text-muted">{td('jira.created')}</p>
              <p className="text-lg font-bold text-status-success">{jiraResult.createdTickets?.length ?? 0}</p>
            </div>
            <div className="rounded-lg border border-white/14 bg-white/8 p-3 text-center">
              <p className="text-xs text-text-muted">{td('jira.skipped')}</p>
              <p className="text-lg font-bold text-status-warning">{jiraResult.skippedCount}</p>
            </div>
            <div className="rounded-lg border border-white/14 bg-white/8 p-3 text-center">
              <p className="text-xs text-text-muted">{td('jira.failed')}</p>
              <p className="text-lg font-bold text-status-danger">{jiraResult.failedCount}</p>
            </div>
          </div>

          {(jiraResult.createdTickets?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-text-primary">{td('jira.references')}</p>
              <ul className="space-y-2">
                {(jiraResult.createdTickets || []).map((ticket) => (
                  <li key={ticket.id} className="rounded-lg border border-status-success/20 bg-white/8 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-primary">{ticket.ticketKey || td('jira.ticketFallback')}</span>
                      {ticket.ticketUrl ? (
                        <a
                          href={ticket.ticketUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-status-success underline hover:opacity-85"
                        >
                          {td('jira.openTicket')}
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(jiraResult.errors?.length ?? 0) > 0 && (
            <div className="mt-4 rounded-lg border border-status-danger/30 bg-status-danger/14 p-3 text-sm text-status-danger">
              <p className="mb-1 font-semibold">{td('jira.errorsTitle')}</p>
              <ul className="list-disc space-y-1 pl-5">
                {(jiraResult.errors || []).map((error, index) => (
                  <li key={`${error}-${index}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-white/14 bg-white/6 p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-cyan-400/16 text-cyan-200 border border-cyan-300/30'
                  : 'border border-white/14 bg-white/6 text-text-secondary hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div id="overview" className="grid grid-cols-1 gap-4">
          <div className="rounded-xl border border-white/14 bg-white/6 p-4">
            <h2 className="mb-3 text-lg font-semibold">{td('timestampsTitle')}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-secondary">{td('requestedAtLabel')}</dt>
                <dd className="font-medium text-text-primary">{formatDate(scan.requestedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-secondary">{td('startedAtLabel')}</dt>
                <dd className="font-medium text-text-primary">{formatDate(scan.startedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-secondary">{td('finishedAtLabel')}</dt>
                <dd className="font-medium text-text-primary">{formatDate(scan.finishedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-text-secondary">{td('durationLabel')}</dt>
                <dd className="font-medium text-text-primary">
                  {durationSeconds !== null ? formatDuration(durationSeconds, td) : td('running')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div id="tools" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            {td('tools')}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/12 bg-white/6">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/8">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{td('tools')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{td('statusLabel')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{td('eta.queuePosition')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{td('eta.jobsAhead')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{td('eta.estimatedFinishAt')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{td('startedAtLabel')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{td('finishedAtLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-transparent">
                {toolRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-text-secondary">{td('toolsEmpty')}</td>
                  </tr>
                ) : toolRows.map((tool) => (
                  <tr key={tool.toolName}>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">{tool.toolName}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${toolStatusClassMap[tool.status] || toolStatusClassMap.Pending}`}>
                        {tool.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{tool.id ? (etaMap[tool.id]?.queuePosition ?? '-') : '-'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{tool.id ? (etaMap[tool.id]?.jobsAheadCount ?? '-') : '-'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {tool.id
                        ? (etaMap[tool.id]?.estimatedFinishAt
                          ? formatDate(etaMap[tool.id]?.estimatedFinishAt || undefined)
                          : td('eta.unavailable'))
                        : td('eta.unavailable')}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(tool.startTime)}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(tool.endTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {toolsLoading && <p className="text-sm text-text-secondary">{td('loadingTools')}</p>}
          {!toolsLoading && !hasAnyEta && (
            <p className="text-sm text-text-secondary">{td('eta.empty')}</p>
          )}
        </div>
      )}

      {activeTab === 'vulnerabilities' && (
        <div id="vulnerabilities" className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {td('vulnerabilities')}
          </h2>
          {vulnerabilities && vulnerabilities.length > 0 ? (
            <div className="space-y-3">
              {vulnerabilities.map((vuln) => (
                <div key={vuln.id} className="rounded-xl border border-white/12 bg-white/6 p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      vuln.severity === 'Critical' ? 'bg-status-danger text-slate-950' :
                      vuln.severity === 'High' ? 'bg-status-danger/20 text-status-danger' :
                      vuln.severity === 'Medium' ? 'bg-status-warning/20 text-status-warning' :
                      'bg-cyan-400/18 text-cyan-200'
                    }`}>
                      {vuln.severity}
                    </span>
                    <span className="text-xs text-text-muted">{vuln.toolName || '-'}</span>
                  </div>
                  <h3 className="font-semibold text-text-primary">{vuln.type || td('vulnerabilityFallback')}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{vuln.description || '-'}</p>
                  {(vuln.jiraTickets?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {vuln.jiraTickets?.map((ticket) => (
                        <a
                          key={ticket.id}
                          href={ticket.ticketUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-status-success/28 bg-status-success/12 px-2 py-0.5 text-xs font-semibold text-status-success"
                        >
                          {ticket.ticketKey || td('jira.ticketFallback')}
                        </a>
                      ))}
                    </div>
                  )}
                  {vuln.recommendation && (
                    <p className="mt-2 rounded-lg border border-white/10 bg-white/8 p-3 text-sm text-text-secondary">
                      {vuln.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/12 bg-white/6 p-8 text-center text-text-secondary">
              {normalizedStatus === 'Completed' ? td('noVulnerabilities') : td('scanInProgress')}
            </div>
          )}
        </div>
      )}

      {activeTab === 'report' && (
        <div id="report" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              {td('report')}
            </h2>
            <Link
              href={`/${locale}/scans/${id}/report`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/6 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/10"
            >
              {td('openReportPage')}
            </Link>
          </div>

          <div className="rounded-xl border border-cyan-300/24 bg-cyan-400/8 p-4 space-y-4">
            <div className="flex items-center gap-2 text-cyan-200">
              <Sparkles className="h-4 w-4" />
              <h3 className="text-sm font-semibold">{td('aiReport.title')}</h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">{td('aiReport.verbosityLabel')}</label>
                <select
                  value={aiVerbosity}
                  onChange={(event) => setAiVerbosity(event.target.value as 'brief' | 'detailed' | 'comprehensive')}
                  className="h-10 w-full rounded-lg border border-white/14 bg-white/6 px-3 text-sm text-text-primary"
                >
                  <option value="brief">{td('aiReport.verbosity.brief')}</option>
                  <option value="detailed">{td('aiReport.verbosity.detailed')}</option>
                  <option value="comprehensive">{td('aiReport.verbosity.comprehensive')}</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/6 px-3 py-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={aiCreateJiraTickets}
                    onChange={(event) => setAiCreateJiraTickets(event.target.checked)}
                    className="h-4 w-4 rounded border-cyan-300/35 bg-white/8 text-cyan-300"
                  />
                  {td('aiReport.createJiraLabel')}
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => generateAiReportMutation.mutate()}
              disabled={generateAiReportMutation.isPending || normalizedStatus !== 'Completed'}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/26 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/14 disabled:cursor-not-allowed disabled:opacity-50"
              title={normalizedStatus !== 'Completed' ? td('aiReport.availableWhenCompleted') : undefined}
            >
              <Sparkles className="h-4 w-4" />
              {generateAiReportMutation.isPending ? td('aiReport.generating') : td('aiReport.generateButton')}
            </button>

            {aiPostScanReport && (
              <div className="space-y-4 rounded-xl border border-white/12 bg-white/6 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{td('aiReport.outputLabel')}</p>
                  <div className="mt-2 rounded-lg border border-white/12 bg-white/8 p-3">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                      {aiOutput}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-white/12 bg-white/8 p-3">
                    <p className="text-xs text-text-muted">{td('aiReport.tokenUsage.prompt')}</p>
                    <p className="text-lg font-semibold text-text-primary">{promptTokens ?? '-'}</p>
                  </div>
                  <div className="rounded-lg border border-white/12 bg-white/8 p-3">
                    <p className="text-xs text-text-muted">{td('aiReport.tokenUsage.completion')}</p>
                    <p className="text-lg font-semibold text-text-primary">{completionTokens ?? '-'}</p>
                  </div>
                  <div className="rounded-lg border border-white/12 bg-white/8 p-3">
                    <p className="text-xs text-text-muted">{td('aiReport.tokenUsage.total')}</p>
                    <p className="text-lg font-semibold text-text-primary">{aiPostScanReport.tokenUsage?.totalTokens ?? '-'}</p>
                  </div>
                </div>

                {(tokenModel || typeof tokenDuration === 'number') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-white/12 bg-white/8 p-3">
                      <p className="text-xs text-text-muted">{td('aiReport.tokenUsage.model')}</p>
                      <p className="text-sm font-semibold text-text-primary">{tokenModel || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-white/12 bg-white/8 p-3">
                      <p className="text-xs text-text-muted">{td('aiReport.tokenUsage.duration')}</p>
                      <p className="text-sm font-semibold text-text-primary">
                        {typeof tokenDuration === 'number' ? `${tokenDuration.toFixed(2)}s` : '-'}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{td('aiReport.rawResponseLabel')}</p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/12 bg-white/8 p-3 text-xs text-text-secondary">
                    {JSON.stringify(aiPostScanReport.raw ?? aiPostScanReport, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {report ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-white/14 bg-white/6 p-4 lg:col-span-1">
                <p className="text-sm text-text-secondary">{td('riskScoreLabel')}</p>
                <p className="mt-2 text-3xl font-bold text-status-danger">{(report.overallRiskScore ?? report.riskScore ?? 0).toFixed(1)}/100</p>
              </div>
              <div className="rounded-xl border border-white/14 bg-white/6 p-4 lg:col-span-2">
                <p className="text-sm text-text-secondary">{td('reportGeneratedAt', { date: report.generatedAt ? new Date(report.generatedAt).toLocaleString(locale) : '-' })}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                  {(['Critical', 'High', 'Medium', 'Low', 'Info'] as const).map((severity) => (
                    <div key={severity} className="rounded-lg border border-white/10 bg-white/8 p-2 text-center">
                      <p className="text-xs text-text-muted">{severity}</p>
                      <p className="font-semibold text-text-primary">{
                        severity === 'Critical' ? (report.criticalCount ?? report.vulnerabilityCounts?.Critical ?? 0) :
                        severity === 'High' ? (report.highCount ?? report.vulnerabilityCounts?.High ?? 0) :
                        severity === 'Medium' ? (report.mediumCount ?? report.vulnerabilityCounts?.Medium ?? 0) :
                        severity === 'Low' ? (report.lowCount ?? report.vulnerabilityCounts?.Low ?? 0) :
                        (report.infoCount ?? report.vulnerabilityCounts?.Info ?? 0)
                      }</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/12 bg-white/6 p-8 text-center text-text-secondary">
              {normalizedStatus === 'Completed' ? td('reportUnavailable') : td('reportPending')}
            </div>
          )}
        </div>
      )}

      <ConfirmationDialog
        isOpen={isCancelDialogOpen}
        title={td('cancelModal.title')}
        description={td('cancelModal.description')}
        confirmLabel={cancelMutation.isPending ? td('canceling') : td('cancelModal.confirm')}
        cancelLabel={td('cancelModal.cancel')}
        onClose={() => {
          if (!cancelMutation.isPending) {
            setIsCancelDialogOpen(false);
          }
        }}
        onConfirm={() => cancelMutation.mutate()}
        isPending={cancelMutation.isPending}
      />
    </div>
  );
}

