'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye, Link2, Pencil, PlugZap, Plus, Trash2, Unlink2, X } from 'lucide-react';
import type {
  CreateJiraProjectRequest,
  JiraConnectionTestResult,
  JiraDeveloperProfileResponse,
  JiraDeveloperSearchResult,
  JiraProject,
  JiraProjectSummary,
  Target,
  UpdateJiraProjectRequest,
} from '@/lib/api/types';
import { jiraProjectsService } from '@/lib/jira/jiraProjectsService';
import { jiraOAuthService } from '@/lib/jira/jiraOAuthService';
import { scansService } from '@/lib/scans/scansService';
import { ApiRequestError } from '@/lib/api/client';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';

type FormState = {
  name: string;
  jiraBaseUrl: string;
  jiraUser: string;
  jiraAuthToken: string;
  jiraProjectKey: string;
  jiraAuthTokenType: string;
  issueType: string;
  customLabels: string;
};

type TeamRoleInput = {
  role: string;
  accountId: string;
};

type CreateFormState = {
  name: string;
  jiraBaseUrl: string;
  jiraUser: string;
  jiraAuthToken: string;
  jiraProjectKey: string;
  jiraAuthTokenType: string;
  issueType: string;
  customLabels: string[];
  teamRoles: TeamRoleInput[];
};

const INITIAL_CREATE_FORM: CreateFormState = {
  name: '',
  jiraBaseUrl: '',
  jiraUser: '',
  jiraAuthToken: '',
  jiraProjectKey: '',
  jiraAuthTokenType: 'Basic',
  issueType: '',
  customLabels: [],
  teamRoles: [{ role: '', accountId: '' }],
};

const mapProjectToForm = (project: JiraProject): FormState => ({
  name: project.name || '',
  jiraBaseUrl: project.url || '',
  jiraUser: project.userEmail || '',
  jiraAuthToken: '',
  jiraProjectKey: project.projectKey || '',
  jiraAuthTokenType: 'Basic',
  issueType: project.issueType || '',
  customLabels: (project.customLabels || []).join(', '),
});

const buildUpdatePayload = (form: FormState): UpdateJiraProjectRequest => ({
  name: form.name.trim(),
  jiraBaseUrl: form.jiraBaseUrl.trim(),
  jiraUser: form.jiraUser.trim(),
  jiraProjectKey: form.jiraProjectKey.trim(),
  jiraAuthTokenType: form.jiraAuthTokenType.trim() || undefined,
  issueType: form.issueType.trim() || undefined,
  customLabels: form.customLabels
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  teamRoles: [],
  ...(form.jiraAuthToken.trim() ? { jiraAuthToken: form.jiraAuthToken.trim() } : {}),
});

export default function JiraProjectsPage() {
  const t = useTranslations('landing.jiraProjects');
  const tCommon = useTranslations('common.states');
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(INITIAL_CREATE_FORM);
  const [createLabelInput, setCreateLabelInput] = useState('');
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [showEditToken, setShowEditToken] = useState(false);
  const [testingProjectId, setTestingProjectId] = useState<string | null>(null);
  const [viewProject, setViewProject] = useState<JiraProject | null>(null);
  const [editProject, setEditProject] = useState<JiraProject | null>(null);
  const [linkProject, setLinkProject] = useState<JiraProject | null>(null);
  const [unlinkProject, setUnlinkProject] = useState<JiraProject | null>(null);
  const [selectedLinkTargetId, setSelectedLinkTargetId] = useState('');
  const [selectedUnlinkTargetId, setSelectedUnlinkTargetId] = useState('');
  const [deleteProject, setDeleteProject] = useState<JiraProject | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [selectedCloudId, setSelectedCloudId] = useState('');
  const [connectionTestResult, setConnectionTestResult] = useState<JiraConnectionTestResult | null>(null);
  const [developerSearchQuery, setDeveloperSearchQuery] = useState('');
  const [verifyCustomRole, setVerifyCustomRole] = useState('');
  const [developerRoleDrafts, setDeveloperRoleDrafts] = useState<Record<string, string>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['jira-projects', page],
    queryFn: () => jiraProjectsService.list(page, 10),
  });

  const { data: targetsData, isLoading: isTargetsLoading } = useQuery({
    queryKey: ['targets-for-jira-link'],
    queryFn: () => scansService.getTargets(1, 200),
  });

  const {
    data: jiraOAuthStatus,
    isLoading: isJiraOAuthStatusLoading,
    isError: isJiraOAuthStatusError,
    refetch: refetchJiraOAuthStatus,
  } = useQuery({
    queryKey: ['jira-oauth-status'],
    queryFn: () => jiraOAuthService.status(),
  });

  const {
    data: jiraOAuthSites,
    isLoading: isJiraOAuthSitesLoading,
    isError: isJiraOAuthSitesError,
    refetch: refetchJiraOAuthSites,
  } = useQuery({
    queryKey: ['jira-oauth-sites', jiraOAuthStatus?.connected],
    queryFn: () => jiraOAuthService.sites(),
    enabled: !!jiraOAuthStatus?.connected,
  });

  const {
    data: jiraOAuthProjects,
    isLoading: isJiraOAuthProjectsLoading,
    isError: isJiraOAuthProjectsError,
    refetch: refetchJiraOAuthProjects,
  } = useQuery<JiraProjectSummary[]>({
    queryKey: ['jira-oauth-projects', selectedCloudId],
    queryFn: () => jiraOAuthService.projects(selectedCloudId),
    enabled: !!selectedCloudId,
  });

  const {
    data: mappedDevelopers,
    isLoading: isMappedDevelopersLoading,
    isError: isMappedDevelopersError,
    refetch: refetchMappedDevelopers,
  } = useQuery<JiraDeveloperProfileResponse[]>({
    queryKey: ['jira-oauth-developers', jiraOAuthStatus?.connected],
    queryFn: () => jiraOAuthService.developers(),
    enabled: !!jiraOAuthStatus?.connected,
  });

  const {
    data: searchDevelopers,
    isLoading: isSearchDevelopersLoading,
    isError: isSearchDevelopersError,
    refetch: refetchSearchDevelopers,
  } = useQuery<JiraDeveloperSearchResult[]>({
    queryKey: ['jira-oauth-developers-search', selectedCloudId, developerSearchQuery],
    queryFn: () => jiraOAuthService.searchDevelopers(selectedCloudId, developerSearchQuery.trim()),
    enabled: !!jiraOAuthStatus?.connected && !!selectedCloudId && developerSearchQuery.trim().length >= 2,
  });

  const totalPages = data?.totalPages ?? (data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1);

  useEffect(() => {
    if (data && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [data, page, totalPages]);

  useEffect(() => {
    if (!jiraOAuthStatus?.connected) {
      setSelectedCloudId('');
      setConnectionTestResult(null);
      setDeveloperSearchQuery('');
      setVerifyCustomRole('');
      setDeveloperRoleDrafts({});
      return;
    }

    if (!selectedCloudId && (jiraOAuthSites?.length ?? 0) > 0) {
      setSelectedCloudId(jiraOAuthSites![0].cloudId);
    }
  }, [jiraOAuthSites, jiraOAuthStatus?.connected, selectedCloudId]);

  useEffect(() => {
    if (!mappedDevelopers || mappedDevelopers.length === 0) {
      setDeveloperRoleDrafts({});
      return;
    }

    const nextDrafts = mappedDevelopers.reduce<Record<string, string>>((acc, developer) => {
      acc[developer.jiraAccountId] = developer.customRole || '';
      return acc;
    }, {});

    setDeveloperRoleDrafts(nextDrafts);
  }, [mappedDevelopers]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateJiraProjectRequest) => jiraProjectsService.create(payload),
    onSuccess: async (createdProject) => {
      setIsCreateOpen(false);
      setShowCreateToken(false);
      setCreateLabelInput('');
      setCreateForm(INITIAL_CREATE_FORM);
      await queryClient.invalidateQueries({ queryKey: ['jira-projects'] });
      setViewProject(createdProject);
      toast.success(t('messages.createSuccess'));
    },
    onError: (err: any) => {
      if (err instanceof ApiRequestError && err.status === 400) {
        toast.error(err.data?.error || t('messages.createError'));
        return;
      }

      toast.error(err?.message || t('messages.createError'));
    },
  });

  const oauthInitiateMutation = useMutation({
    mutationFn: () => jiraOAuthService.initiate(),
    onSuccess: (response) => {
      if (!response?.authorizationUrl) {
        toast.error(t('messages.oauthInitiateError'));
        return;
      }

      if (response.alreadyConnected) {
        toast.success(t('messages.oauthAlreadyConnected'));
      }

      window.location.href = response.authorizationUrl;
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.oauthInitiateError'));
    },
  });

  const oauthDisconnectMutation = useMutation({
    mutationFn: () => jiraOAuthService.disconnect(),
    onSuccess: async () => {
      await refetchJiraOAuthStatus();
      await refetchJiraOAuthSites();
      setConnectionTestResult(null);
      toast.success(t('messages.oauthDisconnectSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.oauthDisconnectError'));
    },
  });

  const oauthTestConnectionMutation = useMutation({
    mutationFn: (cloudId: string) => jiraOAuthService.testConnection(cloudId),
    onSuccess: (result) => {
      setConnectionTestResult(result);
      if (result.success) {
        toast.success(t('messages.oauthTestSuccess'));
      } else {
        toast.error(result.errorMessage || t('messages.oauthTestError'));
      }
    },
    onError: (err: any) => {
      setConnectionTestResult({ success: false, errorMessage: err?.message || t('messages.oauthTestError') });
      toast.error(err?.message || t('messages.oauthTestError'));
    },
  });

  const verifyDeveloperMutation = useMutation({
    mutationFn: (payload: { cloudId: string; jiraAccountId: string; customRole?: string }) =>
      jiraOAuthService.verifyDeveloper(payload),
    onSuccess: async () => {
      await refetchMappedDevelopers();
      await refetchSearchDevelopers();
      toast.success(t('messages.developerVerifySuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.developerVerifyError'));
    },
  });

  const updateDeveloperRoleMutation = useMutation({
    mutationFn: ({ jiraAccountId, customRole }: { jiraAccountId: string; customRole: string }) =>
      jiraOAuthService.updateDeveloperRole(jiraAccountId, customRole),
    onSuccess: async () => {
      await refetchMappedDevelopers();
      toast.success(t('messages.developerRoleUpdateSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.developerRoleUpdateError'));
    },
  });

  const removeDeveloperMutation = useMutation({
    mutationFn: (jiraAccountId: string) => jiraOAuthService.removeDeveloper(jiraAccountId, true),
    onSuccess: async () => {
      await refetchMappedDevelopers();
      await refetchSearchDevelopers();
      toast.success(t('messages.developerDeleteSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.developerDeleteError'));
    },
  });

  const testMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => jiraProjectsService.testConnection(id),
    onSuccess: (response: any) => {
      setTestingProjectId(null);
      // Detect explicit failure flags the backend may return in a 200 body
      const isFailed =
        response === false ||
        response?.isSuccessful === false ||
        response?.success === false ||
        response?.connected === false ||
        response?.status === 'failed' ||
        response?.status === 'error';
      if (isFailed) {
        toast.error(response?.message || response?.error || t('messages.testError'));
        return;
      }
      toast.success(t('messages.testSuccess'));
    },
    onError: (err: any) => {
      setTestingProjectId(null);
      toast.error(err?.message || t('messages.testError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateJiraProjectRequest }) =>
      jiraProjectsService.update(id, payload),
    onSuccess: async () => {
      setEditProject(null);
      setEditForm(null);
      setShowEditToken(false);
      await queryClient.invalidateQueries({ queryKey: ['jira-projects'] });
      toast.success(t('messages.updateSuccess'));
    },
    onError: (err: any) => {
      if (err instanceof ApiRequestError && err.status === 400) {
        toast.error(err.data?.error || t('messages.updateError'));
        return;
      }
      toast.error(err?.message || t('messages.updateError'));
    },
  });

  const linkTargetMutation = useMutation({
    mutationFn: ({ projectId, targetId }: { projectId: string; targetId: string }) =>
      jiraProjectsService.linkTarget(projectId, targetId),
    onSuccess: async () => {
      setLinkProject(null);
      setSelectedLinkTargetId('');
      await queryClient.invalidateQueries({ queryKey: ['jira-projects'] });
      toast.success(t('messages.linkSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.linkError'));
    },
  });

  const unlinkTargetMutation = useMutation({
    mutationFn: (targetId: string) => jiraProjectsService.unlinkTarget(targetId),
    onSuccess: async () => {
      setUnlinkProject(null);
      setSelectedUnlinkTargetId('');
      await queryClient.invalidateQueries({ queryKey: ['jira-projects'] });
      toast.success(t('messages.unlinkSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.unlinkError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jiraProjectsService.delete(id),
    onSuccess: async () => {
      setDeleteProject(null);
      setDeleteConfirmationName('');
      await queryClient.invalidateQueries({ queryKey: ['jira-projects'] });
      toast.success(t('messages.deleteSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.deleteError'));
    },
  });

  const openEdit = (project: JiraProject) => {
    setEditProject(project);
    setEditForm(mapProjectToForm(project));
    setShowEditToken(false);
  };

  const submitEdit = () => {
    if (!editProject || !editForm) {
      return;
    }

    if (!editForm.name.trim() || !editForm.jiraBaseUrl.trim() || !editForm.jiraUser.trim() || !editForm.jiraProjectKey.trim()) {
      toast.error(t('messages.requiredFields'));
      return;
    }

    updateMutation.mutate({ id: editProject.id, payload: buildUpdatePayload(editForm) });
  };

  const queryErrorMessage = error instanceof Error ? error.message : t('messages.loadError');

  const addLabel = () => {
    const label = createLabelInput.trim();
    if (!label) {
      return;
    }

    if (createForm.customLabels.includes(label)) {
      setCreateLabelInput('');
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      customLabels: [...prev.customLabels, label],
    }));
    setCreateLabelInput('');
  };

  const removeLabel = (label: string) => {
    setCreateForm((prev) => ({
      ...prev,
      customLabels: prev.customLabels.filter((item) => item !== label),
    }));
  };

  const addTeamRole = () => {
    setCreateForm((prev) => ({
      ...prev,
      teamRoles: [...prev.teamRoles, { role: '', accountId: '' }],
    }));
  };

  const removeTeamRole = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      teamRoles: prev.teamRoles.filter((_, idx) => idx !== index),
    }));
  };

  const updateTeamRoleField = (index: number, field: keyof TeamRoleInput, value: string) => {
    setCreateForm((prev) => ({
      ...prev,
      teamRoles: prev.teamRoles.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  };

  const submitCreate = () => {
    if (
      !createForm.name.trim() ||
      !createForm.jiraBaseUrl.trim() ||
      !createForm.jiraUser.trim() ||
      !createForm.jiraAuthToken.trim() ||
      !createForm.jiraProjectKey.trim() ||
      !createForm.issueType.trim()
    ) {
      toast.error(t('messages.requiredFields'));
      return;
    }

    const validTeamRoles = createForm.teamRoles
      .map((role) => ({ role: role.role.trim(), accountId: role.accountId.trim() }))
      .filter((role) => role.role && role.accountId);

    createMutation.mutate({
      name: createForm.name.trim(),
      jiraBaseUrl: createForm.jiraBaseUrl.trim(),
      jiraUser: createForm.jiraUser.trim(),
      jiraAuthToken: createForm.jiraAuthToken.trim(),
      jiraProjectKey: createForm.jiraProjectKey.trim(),
      jiraAuthTokenType: createForm.jiraAuthTokenType.trim() || 'Basic',
      issueType: createForm.issueType.trim(),
      customLabels: createForm.customLabels,
      teamRoles: validTeamRoles,
    });
  };

  const targets: Target[] = targetsData?.items ?? [];

  const submitLinkTarget = () => {
    if (!linkProject) {
      return;
    }
    if (!selectedLinkTargetId) {
      toast.error(t('messages.targetRequired'));
      return;
    }
    linkTargetMutation.mutate({ projectId: linkProject.id, targetId: selectedLinkTargetId });
  };

  const submitUnlinkTarget = () => {
    if (!selectedUnlinkTargetId) {
      toast.error(t('messages.targetRequired'));
      return;
    }
    unlinkTargetMutation.mutate(selectedUnlinkTargetId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
          <p className="text-text-secondary">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => oauthInitiateMutation.mutate()}
            disabled={oauthInitiateMutation.isPending}
            data-testid="jira-oauth-connect"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/28 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/14 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlugZap className="h-4 w-4" />
            {oauthInitiateMutation.isPending ? t('actions.connectingOAuth') : t('actions.connectOAuth')}
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            data-testid="jira-open-create"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-400/12 px-4 py-2 text-sm font-medium text-text-primary hover:bg-cyan-400/18"
          >
            <Plus className="h-4 w-4" />
            {t('actions.create')}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-400/18 bg-cyber-panel/75 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">{t('oauth.statusTitle')}</p>
            {isJiraOAuthStatusLoading ? (
              <p className="text-sm text-text-muted">{t('oauth.loading')}</p>
            ) : isJiraOAuthStatusError ? (
              <p className="text-sm text-status-danger">{t('messages.oauthStatusError')}</p>
            ) : jiraOAuthStatus?.connected ? (
              <div className="space-y-1 text-sm text-text-secondary">
                <p>
                  {t('oauth.connectedAs', {
                    email: jiraOAuthStatus.atlassianEmail || '-',
                    name: jiraOAuthStatus.atlassianDisplayName || '-',
                  })}
                </p>
                <p>{t('oauth.sitesCount', { count: jiraOAuthStatus.sites?.length || 0 })}</p>
                <p>{t('oauth.connectedAt', { date: jiraOAuthStatus.connectedAt || '-' })}</p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t('oauth.notConnected')}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => refetchJiraOAuthStatus()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/14 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-cyber-hover/40"
            >
              {t('oauth.refresh')}
            </button>
            <button
              type="button"
              onClick={() => oauthDisconnectMutation.mutate()}
              disabled={!jiraOAuthStatus?.connected || oauthDisconnectMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-status-danger/30 px-4 py-2 text-sm font-medium text-status-danger hover:border-status-danger/40 hover:bg-status-danger/12 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {oauthDisconnectMutation.isPending ? t('actions.disconnectingOAuth') : t('actions.disconnectOAuth')}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-400/18 bg-cyber-panel/75 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full space-y-2 sm:max-w-xl">
            <p className="text-sm font-semibold text-text-primary">{t('developers.title')}</p>
            <p className="text-xs text-text-muted">{t('developers.subtitle')}</p>
            <input
              data-testid="jira-dev-search-input"
              value={developerSearchQuery}
              onChange={(event) => setDeveloperSearchQuery(event.target.value)}
              placeholder={t('developers.searchPlaceholder')}
              disabled={!selectedCloudId || !jiraOAuthStatus?.connected}
              className="h-10 w-full rounded-lg border border-white/14 px-3 text-sm"
            />
          </div>

          <div className="w-full space-y-2 sm:w-72">
            <p className="text-xs font-medium text-text-muted">{t('developers.verifyRoleLabel')}</p>
            <input
              data-testid="jira-dev-verify-role-input"
              value={verifyCustomRole}
              onChange={(event) => setVerifyCustomRole(event.target.value)}
              placeholder={t('developers.verifyRolePlaceholder')}
              className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
            />
          </div>
        </div>

        {developerSearchQuery.trim().length > 0 && developerSearchQuery.trim().length < 2 && (
          <p className="mt-3 text-xs text-text-muted">{t('developers.searchHint')}</p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-text-primary">{t('developers.searchResultsTitle')}</p>
          {isSearchDevelopersLoading ? (
            <p className="text-sm text-text-muted">{t('developers.loadingSearch')}</p>
          ) : isSearchDevelopersError ? (
            <p className="text-sm text-status-danger">{t('messages.developerSearchError')}</p>
          ) : (searchDevelopers?.length ?? 0) === 0 ? (
            <p className="text-sm text-text-muted">{t('developers.noSearchResults')}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-cyan-400/18">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-cyber-hover/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.name')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.email')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.accountType')}</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-cyber-panel/75">
                  {(searchDevelopers || []).map((developer) => (
                    <tr key={developer.jiraAccountId}>
                      <td className="px-4 py-2 text-sm font-medium text-text-primary">{developer.jiraDisplayName}</td>
                      <td className="px-4 py-2 text-sm text-text-secondary">{developer.jiraEmail || '-'}</td>
                      <td className="px-4 py-2 text-sm text-text-secondary">{developer.accountType || '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            verifyDeveloperMutation.mutate({
                              cloudId: selectedCloudId,
                              jiraAccountId: developer.jiraAccountId,
                              customRole: verifyCustomRole.trim() || undefined,
                            })
                          }
                          disabled={!selectedCloudId || verifyDeveloperMutation.isPending}
                          data-testid={`jira-dev-verify-${developer.jiraAccountId}`}
                          className="rounded-md border border-cyan-300/32 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:border-cyan-300/45 hover:bg-cyan-400/12 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {verifyDeveloperMutation.isPending ? t('developers.verifying') : t('developers.verify')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-text-primary">{t('developers.mappedTitle')}</p>
          {isMappedDevelopersLoading ? (
            <p className="text-sm text-text-muted">{t('developers.loadingMapped')}</p>
          ) : isMappedDevelopersError ? (
            <p className="text-sm text-status-danger">{t('messages.developerMappedLoadError')}</p>
          ) : (mappedDevelopers?.length ?? 0) === 0 ? (
            <p className="text-sm text-text-muted">{t('developers.noMapped')}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-cyan-400/18">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-cyber-hover/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.name')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.email')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.role')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.lastVerified')}</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-text-muted">{t('developers.columns.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-cyber-panel/75">
                  {(mappedDevelopers || []).map((developer) => (
                    <tr key={developer.jiraAccountId}>
                      <td className="px-4 py-2 text-sm font-medium text-text-primary">{developer.jiraDisplayName}</td>
                      <td className="px-4 py-2 text-sm text-text-secondary">{developer.jiraEmail || '-'}</td>
                      <td className="px-4 py-2 text-sm text-text-secondary">
                        <input
                          data-testid={`jira-dev-role-${developer.jiraAccountId}`}
                          value={developerRoleDrafts[developer.jiraAccountId] ?? ''}
                          onChange={(event) =>
                            setDeveloperRoleDrafts((prev) => ({
                              ...prev,
                              [developer.jiraAccountId]: event.target.value,
                            }))
                          }
                          className="h-9 w-44 rounded-md border border-white/14 px-2 text-sm"
                          placeholder={t('developers.rolePlaceholder')}
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-text-secondary">
                        {developer.lastVerifiedAt ? new Date(developer.lastVerifiedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateDeveloperRoleMutation.mutate({
                                jiraAccountId: developer.jiraAccountId,
                                customRole: (developerRoleDrafts[developer.jiraAccountId] || '').trim(),
                              })
                            }
                            disabled={updateDeveloperRoleMutation.isPending}
                            data-testid={`jira-dev-save-role-${developer.jiraAccountId}`}
                            className="rounded-md border border-status-info/30 px-3 py-1.5 text-xs font-medium text-status-info hover:border-status-info/40 hover:bg-status-info/12 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updateDeveloperRoleMutation.isPending ? t('actions.saving') : t('developers.saveRole')}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDeveloperMutation.mutate(developer.jiraAccountId)}
                            disabled={removeDeveloperMutation.isPending}
                            data-testid={`jira-dev-remove-${developer.jiraAccountId}`}
                            className="rounded-md border border-status-danger/30 px-3 py-1.5 text-xs font-medium text-status-danger hover:border-status-danger/40 hover:bg-status-danger/12 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {removeDeveloperMutation.isPending ? t('actions.deleting') : t('developers.remove')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-400/18 bg-cyber-panel/75 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xl space-y-2">
            <p className="text-sm font-semibold text-text-primary">{t('oauth.sitesTitle')}</p>
            {isJiraOAuthSitesLoading ? (
              <p className="text-sm text-text-muted">{t('oauth.loadingSites')}</p>
            ) : isJiraOAuthSitesError ? (
              <p className="text-sm text-status-danger">{t('messages.oauthSitesError')}</p>
            ) : (
              <select
                value={selectedCloudId}
                onChange={(event) => {
                  setSelectedCloudId(event.target.value);
                  setConnectionTestResult(null);
                }}
                disabled={!jiraOAuthStatus?.connected || (jiraOAuthSites?.length ?? 0) === 0}
                className="h-10 w-full rounded-lg border border-white/14 px-3 text-sm"
              >
                <option value="">{t('oauth.sitePlaceholder')}</option>
                {(jiraOAuthSites || []).map((site) => (
                  <option key={site.cloudId} value={site.cloudId}>
                    {site.name} ({site.url})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                refetchJiraOAuthSites();
                if (selectedCloudId) {
                  refetchJiraOAuthProjects();
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/14 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-cyber-hover/40"
            >
              {t('oauth.refreshData')}
            </button>
            <button
              type="button"
              onClick={() => selectedCloudId && oauthTestConnectionMutation.mutate(selectedCloudId)}
              disabled={!selectedCloudId || oauthTestConnectionMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-status-success/30 px-4 py-2 text-sm font-medium text-status-success hover:border-status-success/40 hover:bg-status-success/12 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {oauthTestConnectionMutation.isPending ? t('oauth.testingConnection') : t('oauth.testConnection')}
            </button>
          </div>
        </div>

        {connectionTestResult && (
          <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${connectionTestResult.success ? 'border-status-success/30 bg-status-success/12 text-status-success' : 'border-status-danger/30 bg-status-danger/12 text-status-danger'}`}>
            {connectionTestResult.success
              ? t('oauth.testSuccessSummary', {
                  siteName: connectionTestResult.siteName || '-',
                  version: connectionTestResult.jiraVersion || '-',
                })
              : (connectionTestResult.errorMessage || t('messages.oauthTestError'))}
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-text-primary">{t('oauth.projectsTitle')}</p>
          {isJiraOAuthProjectsLoading ? (
            <p className="text-sm text-text-muted">{t('oauth.loadingProjects')}</p>
          ) : isJiraOAuthProjectsError ? (
            <p className="text-sm text-status-danger">{t('messages.oauthProjectsError')}</p>
          ) : !selectedCloudId ? (
            <p className="text-sm text-text-muted">{t('oauth.selectSiteFirst')}</p>
          ) : (jiraOAuthProjects?.length ?? 0) === 0 ? (
            <p className="text-sm text-text-muted">{t('oauth.noProjects')}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-cyan-400/18">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-cyber-hover/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('oauth.projectsColumns.key')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('oauth.projectsColumns.name')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('oauth.projectsColumns.type')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-cyber-panel/75">
                  {(jiraOAuthProjects || []).map((project) => (
                    <tr key={`${project.key}-${project.name}`}>
                      <td className="px-4 py-2 text-sm font-medium text-text-primary">{project.key}</td>
                      <td className="px-4 py-2 text-sm text-text-secondary">{project.name}</td>
                      <td className="px-4 py-2 text-sm text-text-secondary">{project.projectTypeKey || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cyan-400/18 bg-cyber-panel/75 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-cyber-hover/40">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('table.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('table.url')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('table.projectKey')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('table.linkedTargets')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">{t('table.updatedAt')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-cyber-panel/75">
                {isLoading ? (
                  <TableSkeletonRows columns={6} />
                ) : isError ? (
                  <TableErrorRow
                    columns={6}
                    title={queryErrorMessage || tCommon('error')}
                    retryLabel={tCommon('retry')}
                    onRetry={() => refetch()}
                  />
                ) : !data || data.items.length === 0 ? (
                  <TableEmptyRow columns={6} title={t('empty')} />
                ) : (
                  data.items.map((project) => (
                    <tr key={project.id} className="hover:bg-cyber-hover/40">
                      <td className="px-6 py-4 text-sm font-medium text-text-primary">{project.name}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        <span className="break-all">{project.url}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{project.projectKey}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">{project.linkedTargetsCount ?? 0}</td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewProject(project)}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/18 px-3 py-2 text-text-secondary hover:border-cyan-300/35 hover:bg-cyber-hover/40"
                          >
                            <Eye className="h-4 w-4" />
                            {t('actions.view')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(project)}
                            className="inline-flex items-center gap-1 rounded-lg border border-status-info/30 px-3 py-2 text-status-info hover:border-status-info/40 hover:bg-status-info/12"
                          >
                            <Pencil className="h-4 w-4" />
                            {t('actions.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLinkProject(project);
                              setSelectedLinkTargetId('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/28 px-3 py-2 text-cyan-200 hover:border-cyan-300/45 hover:bg-cyan-400/12"
                          >
                            <Link2 className="h-4 w-4" />
                            {t('actions.linkTarget')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUnlinkProject(project);
                              setSelectedUnlinkTargetId('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-status-warning/30 px-3 py-2 text-status-warning hover:border-status-warning/40 hover:bg-status-warning/12"
                          >
                            <Unlink2 className="h-4 w-4" />
                            {t('actions.unlinkTarget')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTestingProjectId(project.id);
                              testMutation.mutate({ id: project.id, name: project.name });
                            }}
                            disabled={testingProjectId === project.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-status-success/30 px-3 py-2 text-status-success hover:border-status-success/40 hover:bg-status-success/12 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PlugZap className="h-4 w-4" />
                            {testingProjectId === project.id ? t('actions.testing') : t('actions.test')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteProject(project)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-status-danger/30 px-3 py-2 text-status-danger hover:border-status-danger/40 hover:bg-status-danger/12 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('actions.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-cyan-400/18 bg-cyber-panel/75 px-4 py-3 sm:px-6">
            <p className="text-sm text-text-secondary">
              {t('pagination.page')} <span className="font-medium">{page}</span> {t('pagination.of')}{' '}
              <span className="font-medium">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-md border border-white/14 px-3 py-2 text-sm text-text-secondary hover:bg-cyber-hover/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('pagination.previous')}
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-white/14 px-3 py-2 text-sm text-text-secondary hover:bg-cyber-hover/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {viewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewProject(null)}>
          <div className="w-full max-w-2xl rounded-xl bg-cyber-panel/75 p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary">{t('viewDialog.title')}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-text-muted">{t('table.name')}</p>
                <p className="text-sm font-medium text-text-primary">{viewProject.name}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t('table.projectKey')}</p>
                <p className="text-sm font-medium text-text-primary">{viewProject.projectKey}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-text-muted">{t('table.url')}</p>
                <p className="break-all text-sm font-medium text-text-primary">{viewProject.url}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t('viewDialog.userEmail')}</p>
                <p className="text-sm font-medium text-text-primary">{viewProject.userEmail || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t('viewDialog.issueType')}</p>
                <p className="text-sm font-medium text-text-primary">{viewProject.issueType || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t('viewDialog.apiToken')}</p>
                <p className="text-sm font-medium text-text-primary">{viewProject.apiTokenMasked || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{t('table.linkedTargets')}</p>
                <p className="text-sm font-medium text-text-primary">{viewProject.linkedTargetsCount ?? 0}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewProject(null)}
                className="rounded-lg border border-white/14 px-4 py-2 text-sm text-text-secondary hover:bg-cyber-hover/40"
              >
                {t('actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => !createMutation.isPending && setIsCreateOpen(false)}>
          <div className="w-full max-w-3xl rounded-xl bg-cyber-panel/75 p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary">{t('createDialog.title')}</h3>
            <p className="mt-1 text-sm text-text-secondary">{t('createDialog.description')}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-text-muted">{t('table.name')}</span>
                <input
                  data-testid="jira-create-name"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-text-muted">{t('table.projectKey')}</span>
                <input
                  data-testid="jira-create-project-key"
                  value={createForm.jiraProjectKey}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, jiraProjectKey: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-text-muted">{t('table.url')}</span>
                <input
                  data-testid="jira-create-url"
                  value={createForm.jiraBaseUrl}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, jiraBaseUrl: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-text-muted">{t('createDialog.user')}</span>
                <input
                  data-testid="jira-create-user"
                  value={createForm.jiraUser}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, jiraUser: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-text-muted">{t('createDialog.issueType')}</span>
                <input
                  data-testid="jira-create-issue-type"
                  value={createForm.issueType}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, issueType: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-text-muted">{t('createDialog.token')}</span>
                <div className="flex gap-2">
                  <input
                    type={showCreateToken ? 'text' : 'password'}
                    data-testid="jira-create-token"
                    value={createForm.jiraAuthToken}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, jiraAuthToken: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                    placeholder={t('createDialog.tokenPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateToken((prev) => !prev)}
                    className="rounded-lg border border-white/14 px-3 text-sm text-text-secondary hover:bg-cyber-hover/40"
                  >
                    {showCreateToken ? t('createDialog.hideToken') : t('createDialog.showToken')}
                  </button>
                </div>
              </label>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-muted">{t('createDialog.teamRoles')}</p>
                  <button
                    type="button"
                    onClick={addTeamRole}
                    className="inline-flex items-center gap-1 rounded-md border border-white/14 px-2 py-1 text-xs text-text-secondary hover:bg-cyber-hover/40"
                  >
                    <Plus className="h-3 w-3" />
                    {t('createDialog.addRole')}
                  </button>
                </div>
                <div className="space-y-2">
                  {createForm.teamRoles.map((teamRole, index) => (
                    <div key={`team-role-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={teamRole.role}
                        onChange={(event) => updateTeamRoleField(index, 'role', event.target.value)}
                        className="h-10 rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                        placeholder={t('createDialog.rolePlaceholder')}
                      />
                      <input
                        value={teamRole.accountId}
                        onChange={(event) => updateTeamRoleField(index, 'accountId', event.target.value)}
                        className="h-10 rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                        placeholder={t('createDialog.accountIdPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => removeTeamRole(index)}
                        disabled={createForm.teamRoles.length === 1}
                        className="inline-flex items-center justify-center rounded-lg border border-status-danger/30 px-3 text-status-danger hover:bg-status-danger/12 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <p className="text-xs font-semibold text-text-muted">{t('createDialog.labels')}</p>
                <div className="flex gap-2">
                  <input
                    value={createLabelInput}
                    onChange={(event) => setCreateLabelInput(event.target.value)}
                    className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                    placeholder={t('createDialog.labelPlaceholder')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addLabel();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addLabel}
                    className="rounded-lg border border-white/14 px-3 text-sm text-text-secondary hover:bg-cyber-hover/40"
                  >
                    {t('createDialog.addLabel')}
                  </button>
                </div>
                {createForm.customLabels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {createForm.customLabels.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => removeLabel(label)}
                        className="inline-flex items-center gap-1 rounded-full border border-status-info/30 bg-status-info/12 px-2.5 py-1 text-xs text-status-info"
                      >
                        {label}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={createMutation.isPending}
                className="rounded-lg border border-white/14 px-4 py-2 text-sm text-text-secondary hover:bg-cyber-hover/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitCreate}
                data-testid="jira-create-submit"
                disabled={createMutation.isPending}
                className="rounded-lg border border-cyan-300/35 bg-cyan-400/12 px-4 py-2 text-sm font-medium text-text-primary hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? t('actions.creating') : t('actions.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editProject && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setEditProject(null)}>
          <div className="w-full max-w-2xl rounded-xl bg-cyber-panel/75 p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary">{t('editDialog.title')}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-text-muted">{t('table.name')}</span>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, name: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-text-muted">{t('table.url')}</span>
                <input
                  value={editForm.jiraBaseUrl}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, jiraBaseUrl: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-text-muted">{t('editDialog.user')}</span>
                <input
                  value={editForm.jiraUser}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, jiraUser: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-text-muted">{t('editDialog.token')}</span>
                <div className="flex gap-2">
                  <input
                    type={showEditToken ? 'text' : 'password'}
                    value={editForm.jiraAuthToken}
                    onChange={(event) => setEditForm((prev) => prev ? { ...prev, jiraAuthToken: event.target.value } : prev)}
                    className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                    placeholder={t('editDialog.tokenPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditToken((prev) => !prev)}
                    className="rounded-lg border border-white/14 px-3 text-sm text-text-secondary hover:bg-cyber-hover/40"
                  >
                    {showEditToken ? t('editDialog.hideToken') : t('editDialog.showToken')}
                  </button>
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-text-muted">{t('table.projectKey')}</span>
                <input
                  value={editForm.jiraProjectKey}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, jiraProjectKey: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-text-muted">{t('editDialog.issueType')}</span>
                <input
                  value={editForm.issueType}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, issueType: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-text-muted">{t('editDialog.customLabels')}</span>
                <input
                  value={editForm.customLabels}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, customLabels: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300/45"
                  placeholder={t('editDialog.customLabelsPlaceholder')}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditProject(null);
                  setEditForm(null);
                  setShowEditToken(false);
                }}
                className="rounded-lg border border-white/14 px-4 py-2 text-sm text-text-secondary hover:bg-cyber-hover/40"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={updateMutation.isPending}
                className="rounded-lg border border-cyan-300/35 bg-cyan-400/12 px-4 py-2 text-sm font-medium text-text-primary hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateMutation.isPending ? t('actions.saving') : t('actions.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => {
          setDeleteProject(null);
          setDeleteConfirmationName('');
        }}>
          <div className="w-full max-w-md rounded-xl bg-cyber-panel/75 p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary">{t('deleteDialog.title')}</h3>
            <p className="mt-2 text-sm text-text-secondary">{t('deleteDialog.description', { name: deleteProject.name })}</p>
            <p className="mt-3 text-xs text-text-muted">{t('deleteDialog.confirmNameHint', { name: deleteProject.name })}</p>
            <input
              value={deleteConfirmationName}
              onChange={(event) => setDeleteConfirmationName(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-white/14 px-3 text-sm"
              placeholder={t('deleteDialog.confirmNamePlaceholder')}
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteProject(null);
                  setDeleteConfirmationName('');
                }}
                className="rounded-lg border border-white/14 px-4 py-2 text-sm text-text-secondary hover:bg-cyber-hover/40"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteProject.id)}
                disabled={deleteMutation.isPending || deleteConfirmationName.trim() !== deleteProject.name}
                className="rounded-lg border border-status-danger/45 bg-status-danger/18 px-4 py-2 text-sm font-medium text-text-primary hover:bg-status-danger/24 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteMutation.isPending ? t('actions.deleting') : t('actions.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {linkProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => {
          if (!linkTargetMutation.isPending) {
            setLinkProject(null);
            setSelectedLinkTargetId('');
          }
        }}>
          <div className="w-full max-w-lg rounded-xl bg-cyber-panel/75 p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary">{t('linkDialog.title')}</h3>
            <p className="mt-2 text-sm text-text-secondary">{t('linkDialog.description', { name: linkProject.name })}</p>

            <label className="mt-4 block space-y-1">
              <span className="text-xs text-text-muted">{t('linkDialog.target')}</span>
              <select
                value={selectedLinkTargetId}
                onChange={(event) => setSelectedLinkTargetId(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/14 px-3 text-sm"
                disabled={isTargetsLoading || linkTargetMutation.isPending}
              >
                <option value="">{t('linkDialog.targetPlaceholder')}</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.url}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinkProject(null);
                  setSelectedLinkTargetId('');
                }}
                disabled={linkTargetMutation.isPending}
                className="rounded-lg border border-white/14 px-4 py-2 text-sm text-text-secondary hover:bg-cyber-hover/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitLinkTarget}
                disabled={linkTargetMutation.isPending || !selectedLinkTargetId}
                className="rounded-lg border border-cyan-300/35 bg-cyan-400/12 px-4 py-2 text-sm font-medium text-text-primary hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {linkTargetMutation.isPending ? t('actions.linking') : t('actions.linkTarget')}
              </button>
            </div>
          </div>
        </div>
      )}

      {unlinkProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => {
          if (!unlinkTargetMutation.isPending) {
            setUnlinkProject(null);
            setSelectedUnlinkTargetId('');
          }
        }}>
          <div className="w-full max-w-lg rounded-xl bg-cyber-panel/75 p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary">{t('unlinkDialog.title')}</h3>
            <p className="mt-2 text-sm text-text-secondary">{t('unlinkDialog.description')}</p>

            <label className="mt-4 block space-y-1">
              <span className="text-xs text-text-muted">{t('unlinkDialog.target')}</span>
              <select
                value={selectedUnlinkTargetId}
                onChange={(event) => setSelectedUnlinkTargetId(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/14 px-3 text-sm"
                disabled={isTargetsLoading || unlinkTargetMutation.isPending}
              >
                <option value="">{t('unlinkDialog.targetPlaceholder')}</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.url}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUnlinkProject(null);
                  setSelectedUnlinkTargetId('');
                }}
                disabled={unlinkTargetMutation.isPending}
                className="rounded-lg border border-white/14 px-4 py-2 text-sm text-text-secondary hover:bg-cyber-hover/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitUnlinkTarget}
                disabled={unlinkTargetMutation.isPending || !selectedUnlinkTargetId}
                className="rounded-lg border border-status-warning/45 bg-status-warning/18 px-4 py-2 text-sm font-medium text-text-primary hover:bg-status-warning/24 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {unlinkTargetMutation.isPending ? t('actions.unlinking') : t('actions.unlinkTarget')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

