'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, BarChart, CalendarClock, Download, Search, ShieldAlert, X } from 'lucide-react';
import { scansService } from '@/lib/scans/scansService';
import type { Vulnerability } from '@/lib/api/types';
import { toast } from 'sonner';
import { PanelEmptyState, PanelErrorState, PanelLoadingState } from '@/components/common/AsyncStates';

const severityStyles: Record<string, string> = {
  Critical: 'border-red-200 bg-red-50 text-red-700',
  High: 'border-orange-200 bg-orange-50 text-orange-700',
  Medium: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  Low: 'border-green-200 bg-green-50 text-green-700',
  Info: 'border-blue-200 bg-blue-50 text-blue-700',
};

const severityChartColors: Record<string, string> = {
  Critical: '#dc2626',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
  Info: '#3b82f6',
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
    queryFn: () => scansService.getReport(id),
    enabled: !!id,
  });

  const { data: vulnerabilities, isLoading: vulnerabilitiesLoading } = useQuery({
    queryKey: ['scan-vulnerabilities', id],
    queryFn: () => scansService.getScanVulnerabilities(id),
    enabled: !!id,
  });

  const exportPdfMutation = useMutation({
    mutationFn: () => scansService.exportScanPdf(id),
    onSuccess: (blob) => {
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `scan-report-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      toast.success(t('export.success'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('export.error'));
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

  if (!scan || !report) {
    return <PanelEmptyState title={td('reportUnavailable')} />;
  }

  const severityCounts = {
    Critical: report.criticalCount ?? report.vulnerabilityCounts?.Critical ?? 0,
    High: report.highCount ?? report.vulnerabilityCounts?.High ?? 0,
    Medium: report.mediumCount ?? report.vulnerabilityCounts?.Medium ?? 0,
    Low: report.lowCount ?? report.vulnerabilityCounts?.Low ?? 0,
    Info: report.infoCount ?? report.vulnerabilityCounts?.Info ?? 0,
  };

  const totalVulnerabilities = report.totalVulnerabilities ?? Object.values(severityCounts).reduce((sum, value) => sum + value, 0);
  const overallRiskScore = report.overallRiskScore ?? report.riskScore ?? 0;
  const severityRank: Record<string, number> = { Critical: 5, High: 4, Medium: 3, Low: 2, Info: 1 };
  const chartEntries = (Object.entries(severityCounts) as Array<[keyof typeof severityCounts, number]>).map(([label, value]) => ({
    label,
    value,
    color: severityChartColors[label],
  }));
  const donutSegments = buildDonutSegments(chartEntries);
  const highestSeverityCount = Math.max(...chartEntries.map((entry) => entry.value), 1);
  const riskPercentage = Math.max(0, Math.min(overallRiskScore, 100));

  const filteredVulnerabilities = useMemo(() => {
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
  }, [searchTerm, severityFilter, sortBy, vulnerabilities]);

  const sectionLinks = [
    { href: '#summary', label: t('nav.summary') },
    { href: '#charts', label: t('nav.charts') },
    { href: '#vulnerabilities', label: t('nav.vulnerabilities') },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-sky-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">{t('eyebrow')}</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{t('title', { id: scan.id.slice(0, 8) })}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{td('statusLabel')}</span>
              <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                {scan.status}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span>{t('reportMeta', { date: formatDate(report.generatedAt) })}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">{t('subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => exportPdfMutation.mutate()}
            disabled={exportPdfMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exportPdfMutation.isPending ? t('export.exporting') : t('export.button')}
          </button>
          <Link
            href={`/${locale}/scans/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>

      <div id="summary" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 scroll-mt-24">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ShieldAlert className="h-4 w-4" />
            {t('cards.totalVulnerabilities')}
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{totalVulnerabilities}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BarChart className="h-4 w-4" />
            {t('cards.riskScore')}
          </div>
          <p className="mt-3 text-3xl font-bold text-red-600">{overallRiskScore.toFixed(1)}/100</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarClock className="h-4 w-4" />
            {t('cards.generatedAt')}
          </div>
          <p className="mt-3 text-base font-semibold text-gray-900">{formatDate(report.generatedAt)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4" />
            {t('cards.scanStatus')}
          </div>
          <p className="mt-3 text-base font-semibold text-gray-900">{scan.status}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('severityTitle')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('severitySubtitle')}</p>
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">{t('summaryTitle')}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500">{td('scanIdLabel')}</dt>
              <dd className="font-medium text-gray-900">{scan.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500">{td('targetIdLabel')}</dt>
              <dd className="font-medium text-gray-900">{scan.targetId}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500">{td('requestedAtLabel')}</dt>
              <dd className="font-medium text-gray-900">{formatDate(scan.requestedAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-500">{td('finishedAtLabel')}</dt>
              <dd className="font-medium text-gray-900">{formatDate(scan.finishedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">{t('highlightsTitle')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('highlights.criticalHigh')}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{severityCounts.Critical + severityCounts.High}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('highlights.mediumLow')}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{severityCounts.Medium + severityCounts.Low}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('highlights.informational')}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{severityCounts.Info}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('highlights.toolsUsed')}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{scan.toolNames.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div id="charts" className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr] scroll-mt-24">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('charts.severityTitle')}</h2>
              <p className="mt-1 text-sm text-gray-600">{t('charts.severitySubtitle')}</p>
            </div>
            <div className="text-sm font-medium text-gray-500">{t('charts.totalIssues', { count: totalVulnerabilities })}</div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:items-center">
            <div className="mx-auto flex w-full max-w-[260px] items-center justify-center">
              <div className="relative h-56 w-56">
                <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                  <circle cx="21" cy="21" r="15.915" fill="none" stroke="#e5e7eb" strokeWidth="4" />
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('charts.centerLabel')}</span>
                  <span className="mt-1 text-3xl font-bold text-gray-900">{totalVulnerabilities}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {chartEntries.map((entry) => (
                <div key={entry.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium text-gray-700">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.label}
                    </div>
                    <span className="text-gray-500">{entry.value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
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

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('charts.riskTitle')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('charts.riskSubtitle')}</p>
          </div>

          <div className="mt-6 rounded-2xl bg-gray-50 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('charts.riskScore')}</p>
                <p className="mt-2 text-4xl font-bold text-gray-900">{overallRiskScore.toFixed(1)}</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                riskPercentage >= 75 ? 'bg-red-100 text-red-700' :
                riskPercentage >= 50 ? 'bg-orange-100 text-orange-700' :
                riskPercentage >= 25 ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {riskPercentage >= 75 ? t('charts.riskBands.critical') :
                  riskPercentage >= 50 ? t('charts.riskBands.high') :
                  riskPercentage >= 25 ? t('charts.riskBands.medium') :
                  t('charts.riskBands.low')}
              </div>
            </div>

            <div className="mt-5">
              <div className="h-4 overflow-hidden rounded-full bg-white shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 transition-all"
                  style={{ width: `${riskPercentage}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-medium text-gray-500">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('charts.criticalExposure')}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{severityCounts.Critical}</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('charts.highExposure')}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{severityCounts.High}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="vulnerabilities" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm scroll-mt-24">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('vulnerabilities.title')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('vulnerabilities.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.search')}</span>
              <div className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('vulnerabilities.searchPlaceholder')}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.filter')}</span>
              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none"
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
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.sort')}</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none"
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

        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.columns.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.columns.severity')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.columns.tool')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.columns.resource')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {vulnerabilitiesLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">{t('vulnerabilities.loading')}</td>
                </tr>
              ) : filteredVulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">{t('vulnerabilities.empty')}</td>
                </tr>
              ) : filteredVulnerabilities.map((vulnerability) => (
                <tr key={vulnerability.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">{vulnerability.name || vulnerability.type || td('vulnerabilityFallback')}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-gray-500">{vulnerability.description || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${severityStyles[vulnerability.severity] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                      {vulnerability.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{vulnerability.toolName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{vulnerability.affectedResource || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedVulnerability(vulnerability)}
                      className="rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50"
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
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50" onClick={() => setSelectedVulnerability(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vulnerability-details-title"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h3 id="vulnerability-details-title" className="text-lg font-semibold text-gray-900">
                  {selectedVulnerability.name || selectedVulnerability.type || td('vulnerabilityFallback')}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{t('vulnerabilities.drawerSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVulnerability(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('vulnerabilities.closeDrawer')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityStyles[selectedVulnerability.severity] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                  {selectedVulnerability.severity}
                </span>
                <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {selectedVulnerability.toolName || '-'}
                </span>
                {typeof selectedVulnerability.cvssScore === 'number' && (
                  <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    CVSS {selectedVulnerability.cvssScore.toFixed(1)}
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.sections.description')}</p>
                <p className="mt-2 text-sm leading-7 text-gray-700">{selectedVulnerability.description || '-'}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.sections.resource')}</p>
                  <p className="mt-2 break-all text-sm text-gray-700">{selectedVulnerability.affectedResource || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.sections.identifier')}</p>
                  <p className="mt-2 break-all text-sm text-gray-700">{selectedVulnerability.id}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.sections.recommendation')}</p>
                <p className="mt-2 text-sm leading-7 text-gray-700">{selectedVulnerability.recommendation || '-'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('vulnerabilities.sections.evidence')}</p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-4 text-sm text-gray-700">{selectedVulnerability.evidence || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}