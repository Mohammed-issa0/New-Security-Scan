'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, BarChart, CalendarClock, RefreshCw, Search, ShieldAlert, Sparkles, X, Download  } from 'lucide-react';
import { scansService } from '@/lib/scans/scansService';
import type { GenerateReportResponse, ReportStatusResponse, Vulnerability } from '@/lib/api/types';
import { toast } from 'sonner';
import { PanelEmptyState, PanelErrorState, PanelLoadingState } from '@/components/common/AsyncStates';
import { ApiRequestError } from '@/lib/api/client';

const severityStyles: Record<string, string> = {
  Critical: 'border-status-danger/30 bg-status-danger/14 text-status-danger',
  High: 'border-status-danger/22 bg-status-danger/10 text-status-danger',
  Medium: 'border-status-warning/30 bg-status-warning/14 text-status-warning',
  Low: 'border-status-success/28 bg-status-success/14 text-status-success',
  Info: 'border-cyan-300/26 bg-cyan-400/12 text-cyan-200',
};

const severityChartColors: Record<string, string> = {
  Critical: 'rgb(var(--danger))',
  High: 'rgb(var(--danger) / 0.82)',
  Medium: 'rgb(var(--warning))',
  Low: 'rgb(var(--success))',
  Info: 'rgb(var(--info))',
};

function buildDonutSegments(entries: Array<{ label: string; value: number; color: string }>) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (total === 0) {
    return [];
  }

  let offset = 0;
  return entries.map((entry) => {
    const percentage = entry.value / total;
    const strokeLength = percentage * 100;
    const segment = {
      ...entry,
      strokeDasharray: `${strokeLength} ${100 - strokeLength}`,
      strokeDashoffset: -offset,
      percentage,
    };
    offset += strokeLength;
    return segment;
  });
}

export default function ScanReportPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('landing.scans.reportPage');
  const td = useTranslations('landing.scans.details');
  const tCommon = useTranslations('common.states');
  const locale = useLocale();
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'severity-desc' | 'severity-asc' | 'name-asc' | 'name-desc' | 'tool-asc'>('severity-desc');
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [reportMode, setReportMode] = useState('comprehensive');
  const [outputFormats, setOutputFormats] = useState<string[]>(['Pdf']);
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `report-${Date.now()}`;
  });

  const {
    data: scan,
    isLoading: scanLoading,
    isError: scanError,
    error: scanErrorObj,
    refetch: refetchScan,
  } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => scansService.getScanDetails(id),
  });

  const {
    data: report,
    isLoading: reportLoading,
    isError: reportError,
    error: reportErrorObj,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['scan-report', id],
    queryFn: async () => {
      try {
        return await scansService.getReport(id);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!id,
  });

  const {
    data: generatedReportStatus,
    isLoading: generatedReportStatusLoading,
    refetch: refetchGeneratedReportStatus,
  } = useQuery<ReportStatusResponse>({
    queryKey: ['generated-report-status', generatedReportId],
    queryFn: () => scansService.getGeneratedReportStatus(generatedReportId!),
    enabled: !!generatedReportId,
    refetchInterval: (query) => {
      const status = String(query.state.data?.status || '').toLowerCase();
      return status === 'pending' || status === 'processing' ? 3000 : false;
    },
  });

  const { data: vulnerabilities, isLoading: vulnerabilitiesLoading } = useQuery({
    queryKey: ['scan-vulnerabilities', id],
    queryFn: () => scansService.getScanVulnerabilities(id),
    enabled: !!id,
  });

  const generateAsyncReportMutation = useMutation({
    mutationFn: () => scansService.generateReport(id, {
      reportMode,
      outputFormats,
      idempotencyKey,
    }),
    onSuccess: (response: GenerateReportResponse) => {
      setGeneratedReportId(response.reportId || null);
      toast.success(t('asyncReport.generateSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('asyncReport.generateError'));
    },
  });

  const downloadGeneratedReportMutation = useMutation({
    mutationFn: () => scansService.downloadGeneratedReport(generatedReportId!, 'Pdf'),
    onSuccess: (blob) => {
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `generated-report-${generatedReportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      toast.success(t('asyncReport.downloadSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('asyncReport.downloadError'));
    },
  });

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleString(locale) : '-');

  if (scanLoading || reportLoading) {
    return <PanelLoadingState title={tCommon('loading')} />;
  }

  if (scanError || reportError) {
    return (
      <PanelErrorState
        title={(scanErrorObj instanceof Error && scanErrorObj.message) || (reportErrorObj instanceof Error && reportErrorObj.message) || tCommon('error')}
        retryLabel={tCommon('retry')}
        onRetry={() => {
          refetchScan();
          refetchReport();
        }}
      />
    );
  }

  if (!scan) {
    return <PanelEmptyState title={td('reportUnavailable')} />;
  }

  const severityCounts = {
    Critical: report?.criticalCount ?? report?.vulnerabilityCounts?.Critical ?? 0,
    High: report?.highCount ?? report?.vulnerabilityCounts?.High ?? 0,
    Medium: report?.mediumCount ?? report?.vulnerabilityCounts?.Medium ?? 0,
    Low: report?.lowCount ?? report?.vulnerabilityCounts?.Low ?? 0,
    Info: report?.infoCount ?? report?.vulnerabilityCounts?.Info ?? 0,
  };

  const totalVulnerabilities = report?.totalVulnerabilities ?? Object.values(severityCounts).reduce((sum, value) => sum + value, 0);
  const overallRiskScore = report?.overallRiskScore ?? report?.riskScore ?? 0;
  const severityRank: Record<string, number> = { Critical: 5, High: 4, Medium: 3, Low: 2, Info: 1 };
  const chartEntries = (Object.entries(severityCounts) as Array<[keyof typeof severityCounts, number]>).map(([label, value]) => ({
    label,
    value,
    color: severityChartColors[label],
  }));
  const donutSegments = buildDonutSegments(chartEntries);
  const highestSeverityCount = Math.max(...chartEntries.map((entry) => entry.value), 1);
  const riskPercentage = Math.max(0, Math.min(overallRiskScore, 100));
  const generatedReportState = String(generatedReportStatus?.status || '').toLowerCase();
  const generatedReportReady = generatedReportState === 'completed' && !!generatedReportId;
  const canDownloadGeneratedReport = generatedReportReady && !downloadGeneratedReportMutation.isPending;

  const filteredVulnerabilities = (() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const nextItems = (vulnerabilities || []).filter((vulnerability) => {
      const matchesSeverity = severityFilter === 'All' || vulnerability.severity === severityFilter;
      const haystack = [
        vulnerability.name,
        vulnerability.type,
        vulnerability.description,
        vulnerability.toolName,
        vulnerability.affectedResource,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesSeverity && matchesSearch;
    });

    nextItems.sort((left, right) => {
      if (sortBy === 'severity-desc') {
        return (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0);
      }
      if (sortBy === 'severity-asc') {
        return (severityRank[left.severity] || 0) - (severityRank[right.severity] || 0);
      }
      if (sortBy === 'tool-asc') {
        return (left.toolName || '').localeCompare(right.toolName || '');
      }

      const leftName = (left.name || left.type || '').toLowerCase();
      const rightName = (right.name || right.type || '').toLowerCase();
      return sortBy === 'name-asc'
        ? leftName.localeCompare(rightName)
        : rightName.localeCompare(leftName);
    });

    return nextItems;
  })();

  const sectionLinks = [
    { href: '#summary', label: t('nav.summary') },
    { href: '#charts', label: t('nav.charts') },
    { href: '#vulnerabilities', label: t('nav.vulnerabilities') },
  ];

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{t('eyebrow')}</p>
            <h1 className="mt-2 text-3xl font-bold text-text-primary">{t('title', { id: scan.id.slice(0, 8) })}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{td('statusLabel')}</span>
              <span className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-2.5 py-1 text-xs font-semibold text-text-primary">
                {scan.status}
              </span>
              <span className="text-xs text-text-muted">•</span>
              <span>{t('reportMeta', { date: formatDate(report?.generatedAt) })}</span>
            </div>
            <p className="mt-2 text-sm text-text-secondary">{t('subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/scans/${id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/6 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToScan')}
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {sectionLinks.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="rounded-full border border-white/14 bg-white/6 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-white/10"
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>

      <div className="app-panel rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{t('asyncReport.eyebrow')}</p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">{t('asyncReport.title')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('asyncReport.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/14 bg-white/6 px-3 py-1.5 text-xs font-semibold text-text-secondary">
              {generatedReportId ? t('asyncReport.reportId', { reportId: generatedReportId.slice(0, 8) }) : t('asyncReport.noReportId')}
            </span>
            {generatedReportStatusLoading ? (
              <span className="inline-flex items-center rounded-full border border-cyan-300/28 bg-cyan-400/12 px-3 py-1.5 text-xs font-semibold text-cyan-200">
                {t('asyncReport.loadingStatus')}
              </span>
            ) : generatedReportStatus?.status ? (
              <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${generatedReportReady ? 'border-status-success/28 bg-status-success/14 text-status-success' : generatedReportState === 'failed' ? 'border-status-danger/30 bg-status-danger/14 text-status-danger' : 'border-status-warning/30 bg-status-warning/14 text-status-warning'}`}>
                {t(`asyncReport.status.${generatedReportState || 'pending'}` as any)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-white/14 bg-white/6 px-3 py-1.5 text-xs font-semibold text-text-secondary">
                {t('asyncReport.idle')}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('asyncReport.reportMode')}</span>
              <select
                value={reportMode}
                onChange={(event) => setReportMode(event.target.value)}
                className="h-11 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary outline-none focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/45"
              >
                <option value="standard">{t('asyncReport.modes.standard')}</option>
                <option value="detailed">{t('asyncReport.modes.detailed')}</option>
                <option value="comprehensive">{t('asyncReport.modes.comprehensive')}</option>
              </select>
            </label>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('asyncReport.outputFormats')}</span>
              <div className="flex flex-wrap gap-2">
                {['Pdf', 'Json'].map((format) => {
                  const checked = format === 'Pdf' ? true : outputFormats.includes(format);
                  return (
                    <label key={format} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${checked ? 'border-cyan-300/35 bg-cyan-400/12 text-text-primary' : 'border-white/14 bg-white/6 text-text-secondary hover:bg-white/10'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={format === 'Pdf'}
                        onChange={(event) => {
                          if (format === 'Pdf') {
                            return;
                          }
                          setOutputFormats((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, format]))
                              : current.filter((item) => item !== format)
                          );
                        }}
                        className="h-4 w-4 rounded border-cyan-300/35 bg-transparent text-cyan-300 focus:ring-cyan-300/45"
                      />
                      {format}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <button
              type="button"
              onClick={() => generateAsyncReportMutation.mutate()}
              disabled={generateAsyncReportMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-400/12 px-4 py-2 text-sm font-medium text-text-primary hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {generateAsyncReportMutation.isPending ? t('asyncReport.generating') : t('asyncReport.generateButton')}
            </button>
            <button
              type="button"
              onClick={() => refetchGeneratedReportStatus()}
              disabled={!generatedReportId}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/14 bg-white/6 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {t('asyncReport.refreshStatus')}
            </button>
            <button
              type="button"
              onClick={() => downloadGeneratedReportMutation.mutate()}
              disabled={!canDownloadGeneratedReport}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-status-success/28 bg-status-success/14 px-4 py-2 text-sm font-medium text-status-success hover:bg-status-success/18 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloadGeneratedReportMutation.isPending ? t('asyncReport.downloading') : t('asyncReport.downloadButton')}
            </button>
          </div>
        </div>

        {generatedReportStatus?.errorMessage && generatedReportState === 'failed' && (
          <p className="mt-4 text-sm text-status-danger">{generatedReportStatus.errorMessage}</p>
        )}

        {generatedReportId && !generatedReportReady && generatedReportState !== 'failed' && (
          <p className="mt-4 text-sm text-text-secondary">{t('asyncReport.polling')}</p>
        )}

        {generatedReportReady && (
          <p className="mt-4 text-sm text-status-success">{t('asyncReport.ready')}</p>
        )}
      </div>

      <div id="summary" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 scroll-mt-24">
        <div className="rounded-2xl border border-white/14 bg-white/6 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <ShieldAlert className="h-4 w-4" />
            {t('cards.totalVulnerabilities')}
          </div>
          <p className="mt-3 text-3xl font-bold text-text-primary">{totalVulnerabilities}</p>
        </div>
        <div className="rounded-2xl border border-white/14 bg-white/6 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <BarChart className="h-4 w-4" />
            {t('cards.riskScore')}
          </div>
          <p className="mt-3 text-3xl font-bold text-status-danger">{overallRiskScore.toFixed(1)}/100</p>
        </div>
        <div className="rounded-2xl border border-white/14 bg-white/6 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <CalendarClock className="h-4 w-4" />
            {t('cards.generatedAt')}
          </div>
          <p className="mt-3 text-base font-semibold text-text-primary">{formatDate(report?.generatedAt)}</p>
        </div>
        <div className="rounded-2xl border border-white/14 bg-white/6 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <AlertTriangle className="h-4 w-4" />
            {t('cards.scanStatus')}
          </div>
          <p className="mt-3 text-base font-semibold text-text-primary">{scan.status}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{t('severityTitle')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('severitySubtitle')}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {(Object.entries(severityCounts) as Array<[keyof typeof severityCounts, number]>).map(([severity, count]) => (
            <div key={severity} className={`rounded-2xl border p-4 ${severityStyles[severity]}`}>
              <p className="text-xs font-semibold uppercase tracking-wide">{severity}</p>
              <p className="mt-3 text-3xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">{t('summaryTitle')}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">{td('scanIdLabel')}</dt>
              <dd className="font-medium text-text-primary">{scan.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">{td('targetIdLabel')}</dt>
              <dd className="font-medium text-text-primary">{scan.targetId}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">{td('requestedAtLabel')}</dt>
              <dd className="font-medium text-text-primary">{formatDate(scan.requestedAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">{td('finishedAtLabel')}</dt>
              <dd className="font-medium text-text-primary">{formatDate(scan.finishedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text-primary">{t('highlightsTitle')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('highlights.criticalHigh')}</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{severityCounts.Critical + severityCounts.High}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('highlights.mediumLow')}</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{severityCounts.Medium + severityCounts.Low}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('highlights.informational')}</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{severityCounts.Info}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('highlights.toolsUsed')}</p>
              <p className="mt-2 text-2xl font-bold text-text-primary">{scan.toolNames?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div id="charts" className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr] scroll-mt-24">
        <div className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{t('charts.severityTitle')}</h2>
              <p className="mt-1 text-sm text-text-secondary">{t('charts.severitySubtitle')}</p>
            </div>
            <div className="text-sm font-medium text-text-secondary">{t('charts.totalIssues', { count: totalVulnerabilities })}</div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:items-center">
            <div className="mx-auto flex w-full max-w-[260px] items-center justify-center">
              <div className="relative h-56 w-56">
                <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                  <circle cx="21" cy="21" r="15.915" fill="none" stroke="rgba(255, 255, 255, 0.16)" strokeWidth="4" />
                  {donutSegments.map((segment) => (
                    <circle
                      key={segment.label}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="4"
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('charts.centerLabel')}</span>
                  <span className="mt-1 text-3xl font-bold text-text-primary">{totalVulnerabilities}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {chartEntries.map((entry) => (
                <div key={entry.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium text-text-secondary">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.label}
                    </div>
                    <span className="text-text-muted">{entry.value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(entry.value / highestSeverityCount) * 100}%`,
                        backgroundColor: entry.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{t('charts.riskTitle')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('charts.riskSubtitle')}</p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/8 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('charts.riskScore')}</p>
                <p className="mt-2 text-4xl font-bold text-text-primary">{overallRiskScore.toFixed(1)}</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                riskPercentage >= 75 ? 'bg-status-danger/16 text-status-danger' :
                riskPercentage >= 50 ? 'bg-status-warning/18 text-status-warning' :
                riskPercentage >= 25 ? 'bg-status-info/18 text-status-info' :
                'bg-status-success/16 text-status-success'
              }`}>
                {riskPercentage >= 75 ? t('charts.riskBands.critical') :
                  riskPercentage >= 50 ? t('charts.riskBands.high') :
                  riskPercentage >= 25 ? t('charts.riskBands.medium') :
                  t('charts.riskBands.low')}
              </div>
            </div>

            <div className="mt-5">
              <div className="h-4 overflow-hidden rounded-full bg-white/12 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-status-success via-status-warning to-status-danger transition-all"
                  style={{ width: `${riskPercentage}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-medium text-text-muted">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('charts.criticalExposure')}</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">{severityCounts.Critical}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('charts.highExposure')}</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">{severityCounts.High}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="vulnerabilities" className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm scroll-mt-24">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{t('vulnerabilities.title')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('vulnerabilities.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.search')}</span>
              <div className="flex h-11 items-center gap-2 rounded-lg border border-white/14 bg-white/8 px-3">
                <Search className="h-4 w-4 text-text-muted" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('vulnerabilities.searchPlaceholder')}
                  className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.filter')}</span>
              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}
                className="h-11 w-full rounded-lg border border-white/14 bg-white/8 px-3 text-sm text-text-primary outline-none"
              >
                <option value="All">{t('vulnerabilities.allSeverities')}</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Info">Info</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.sort')}</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="h-11 w-full rounded-lg border border-white/14 bg-white/8 px-3 text-sm text-text-primary outline-none"
              >
                <option value="severity-desc">{t('vulnerabilities.sortOptions.severityDesc')}</option>
                <option value="severity-asc">{t('vulnerabilities.sortOptions.severityAsc')}</option>
                <option value="name-asc">{t('vulnerabilities.sortOptions.nameAsc')}</option>
                <option value="name-desc">{t('vulnerabilities.sortOptions.nameDesc')}</option>
                <option value="tool-asc">{t('vulnerabilities.sortOptions.toolAsc')}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-white/12">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/8">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.columns.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.columns.severity')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.columns.tool')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.columns.resource')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-transparent">
              {vulnerabilitiesLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-secondary">{t('vulnerabilities.loading')}</td>
                </tr>
              ) : filteredVulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-secondary">{t('vulnerabilities.empty')}</td>
                </tr>
              ) : filteredVulnerabilities.map((vulnerability) => (
                <tr key={vulnerability.id} className="hover:bg-white/8">
                  <td className="px-4 py-3 text-sm text-text-primary">
                    <div className="font-medium">{vulnerability.name || vulnerability.type || td('vulnerabilityFallback')}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-text-muted">{vulnerability.description || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${severityStyles[vulnerability.severity] || 'border-white/14 bg-white/8 text-text-secondary'}`}>
                      {vulnerability.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{vulnerability.toolName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{vulnerability.affectedResource || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedVulnerability(vulnerability)}
                      className="rounded-lg border border-white/14 bg-white/8 px-3 py-2 font-medium text-text-secondary hover:bg-white/12"
                    >
                      {t('vulnerabilities.viewDetails')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedVulnerability && (
        <div className="fixed inset-0 z-50 flex justify-end bg-cyber-bg/80" onClick={() => setSelectedVulnerability(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-white/14 bg-cyber-bg text-text-primary shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vulnerability-details-title"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-white/12 bg-cyber-bg/95 px-6 py-4 backdrop-blur">
              <div>
                <h3 id="vulnerability-details-title" className="text-lg font-semibold text-text-primary">
                  {selectedVulnerability.name || selectedVulnerability.type || td('vulnerabilityFallback')}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">{t('vulnerabilities.drawerSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVulnerability(null)}
                className="rounded-lg p-2 text-text-muted hover:bg-white/10 hover:text-text-secondary"
                aria-label={t('vulnerabilities.closeDrawer')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityStyles[selectedVulnerability.severity] || 'border-white/14 bg-white/8 text-text-secondary'}`}>
                  {selectedVulnerability.severity}
                </span>
                <span className="inline-flex rounded-full border border-white/14 bg-white/8 px-2.5 py-1 text-xs font-semibold text-text-secondary">
                  {selectedVulnerability.toolName || '-'}
                </span>
                {typeof selectedVulnerability.cvssScore === 'number' && (
                  <span className="inline-flex rounded-full border border-white/14 bg-white/8 px-2.5 py-1 text-xs font-semibold text-text-secondary">
                    CVSS {selectedVulnerability.cvssScore.toFixed(1)}
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.sections.description')}</p>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{selectedVulnerability.description || '-'}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.sections.resource')}</p>
                  <p className="mt-2 break-all text-sm text-text-secondary">{selectedVulnerability.affectedResource || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.sections.identifier')}</p>
                  <p className="mt-2 break-all text-sm text-text-secondary">{selectedVulnerability.id}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.sections.recommendation')}</p>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{selectedVulnerability.recommendation || '-'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('vulnerabilities.sections.evidence')}</p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-white/8 p-4 text-sm text-text-secondary">{selectedVulnerability.evidence || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}