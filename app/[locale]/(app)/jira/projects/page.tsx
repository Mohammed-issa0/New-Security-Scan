'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye, Link2, Pencil, PlugZap, Plus, Trash2, Unlink2, X } from 'lucide-react';
import type { JiraProject, JiraProjectUpsertRequest, Target } from '@/lib/api/types';
import { jiraProjectsService } from '@/lib/jira/jiraProjectsService';
import { scansService } from '@/lib/scans/scansService';
import { ApiRequestError } from '@/lib/api/client';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';

type FormState = {
  name: string;
  url: string;
  user: string;
  token: string;
  projectKey: string;
  issueType: string;
  customLabels: string;
};

type TeamRoleInput = {
  role: string;
  accountId: string;
};

type CreateFormState = {
  name: string;
  url: string;
  user: string;
  token: string;
  projectKey: string;
  issueType: string;
  customLabels: string[];
  teamRoles: TeamRoleInput[];
};

const INITIAL_CREATE_FORM: CreateFormState = {
  name: '',
  url: '',
  user: '',
  token: '',
  projectKey: '',
  issueType: '',
  customLabels: [],
  teamRoles: [{ role: '', accountId: '' }],
};

const mapProjectToForm = (project: JiraProject): FormState => ({
  name: project.name || '',
  url: project.url || '',
  user: project.userEmail || '',
  token: '',
  projectKey: project.projectKey || '',
  issueType: project.issueType || '',
  customLabels: (project.customLabels || []).join(', '),
});

const buildUpdatePayload = (form: FormState): JiraProjectUpsertRequest => ({
  name: form.name.trim(),
  url: form.url.trim(),
  user: form.user.trim(),
  projectKey: form.projectKey.trim(),
  issueType: form.issueType.trim() || undefined,
  customLabels: form.customLabels
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  teamRoles: [],
  ...(form.token.trim() ? { token: form.token.trim() } : {}),
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['jira-projects', page],
    queryFn: () => jiraProjectsService.list(page, 10),
  });

  const { data: targetsData, isLoading: isTargetsLoading } = useQuery({
    queryKey: ['targets-for-jira-link'],
    queryFn: () => scansService.getTargets(1, 200),
  });

  const totalPages = data?.totalPages ?? (data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1);

  useEffect(() => {
    if (data && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [data, page, totalPages]);

  const createMutation = useMutation({
    mutationFn: (payload: JiraProjectUpsertRequest) => jiraProjectsService.create(payload),
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
    mutationFn: ({ id, payload }: { id: string; payload: JiraProjectUpsertRequest }) =>
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

    if (!editForm.name.trim() || !editForm.url.trim() || !editForm.user.trim() || !editForm.projectKey.trim()) {
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
      !createForm.url.trim() ||
      !createForm.user.trim() ||
      !createForm.token.trim() ||
      !createForm.projectKey.trim() ||
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
      url: createForm.url.trim(),
      user: createForm.user.trim(),
      token: createForm.token.trim(),
      projectKey: createForm.projectKey.trim(),
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
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          data-testid="jira-open-create"
          className="inline-flex items-center gap-2 self-start rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t('actions.create')}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.url')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.projectKey')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.linkedTargets')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.updatedAt')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
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
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{project.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="break-all">{project.url}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{project.projectKey}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{project.linkedTargetsCount ?? 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewProject(project)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            {t('actions.view')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(project)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-blue-700 hover:border-blue-300 hover:bg-blue-50"
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
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50"
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
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
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
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PlugZap className="h-4 w-4" />
                            {testingProjectId === project.id ? t('actions.testing') : t('actions.test')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteProject(project)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-red-700 hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <p className="text-sm text-gray-700">
              {t('pagination.page')} <span className="font-medium">{page}</span> {t('pagination.of')}{' '}
              <span className="font-medium">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('pagination.previous')}
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {viewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewProject(null)}>
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">{t('viewDialog.title')}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">{t('table.name')}</p>
                <p className="text-sm font-medium text-gray-900">{viewProject.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('table.projectKey')}</p>
                <p className="text-sm font-medium text-gray-900">{viewProject.projectKey}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500">{t('table.url')}</p>
                <p className="break-all text-sm font-medium text-gray-900">{viewProject.url}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('viewDialog.userEmail')}</p>
                <p className="text-sm font-medium text-gray-900">{viewProject.userEmail || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('viewDialog.issueType')}</p>
                <p className="text-sm font-medium text-gray-900">{viewProject.issueType || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('viewDialog.apiToken')}</p>
                <p className="text-sm font-medium text-gray-900">{viewProject.apiTokenMasked || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('table.linkedTargets')}</p>
                <p className="text-sm font-medium text-gray-900">{viewProject.linkedTargetsCount ?? 0}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewProject(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !createMutation.isPending && setIsCreateOpen(false)}>
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">{t('createDialog.title')}</h3>
            <p className="mt-1 text-sm text-gray-600">{t('createDialog.description')}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t('table.name')}</span>
                <input
                  data-testid="jira-create-name"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t('table.projectKey')}</span>
                <input
                  data-testid="jira-create-project-key"
                  value={createForm.projectKey}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, projectKey: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-gray-500">{t('table.url')}</span>
                <input
                  data-testid="jira-create-url"
                  value={createForm.url}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, url: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t('createDialog.user')}</span>
                <input
                  data-testid="jira-create-user"
                  value={createForm.user}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, user: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t('createDialog.issueType')}</span>
                <input
                  data-testid="jira-create-issue-type"
                  value={createForm.issueType}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, issueType: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-gray-500">{t('createDialog.token')}</span>
                <div className="flex gap-2">
                  <input
                    type={showCreateToken ? 'text' : 'password'}
                    data-testid="jira-create-token"
                    value={createForm.token}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, token: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                    placeholder={t('createDialog.tokenPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateToken((prev) => !prev)}
                    className="rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {showCreateToken ? t('createDialog.hideToken') : t('createDialog.showToken')}
                  </button>
                </div>
              </label>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500">{t('createDialog.teamRoles')}</p>
                  <button
                    type="button"
                    onClick={addTeamRole}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
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
                        className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                        placeholder={t('createDialog.rolePlaceholder')}
                      />
                      <input
                        value={teamRole.accountId}
                        onChange={(event) => updateTeamRoleField(index, 'accountId', event.target.value)}
                        className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                        placeholder={t('createDialog.accountIdPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => removeTeamRole(index)}
                        disabled={createForm.teamRoles.length === 1}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500">{t('createDialog.labels')}</p>
                <div className="flex gap-2">
                  <input
                    value={createLabelInput}
                    onChange={(event) => setCreateLabelInput(event.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
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
                    className="rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
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
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
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
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitCreate}
                data-testid="jira-create-submit"
                disabled={createMutation.isPending}
                className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? t('actions.creating') : t('actions.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editProject && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditProject(null)}>
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">{t('editDialog.title')}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-gray-500">{t('table.name')}</span>
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, name: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-gray-500">{t('table.url')}</span>
                <input
                  value={editForm.url}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, url: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t('editDialog.user')}</span>
                <input
                  value={editForm.user}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, user: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t('editDialog.token')}</span>
                <div className="flex gap-2">
                  <input
                    type={showEditToken ? 'text' : 'password'}
                    value={editForm.token}
                    onChange={(event) => setEditForm((prev) => prev ? { ...prev, token: event.target.value } : prev)}
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                    placeholder={t('editDialog.tokenPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditToken((prev) => !prev)}
                    className="rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {showEditToken ? t('editDialog.hideToken') : t('editDialog.showToken')}
                  </button>
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t('table.projectKey')}</span>
                <input
                  value={editForm.projectKey}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, projectKey: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">{t('editDialog.issueType')}</span>
                <input
                  value={editForm.issueType}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, issueType: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-gray-500">{t('editDialog.customLabels')}</span>
                <input
                  value={editForm.customLabels}
                  onChange={(event) => setEditForm((prev) => prev ? { ...prev, customLabels: event.target.value } : prev)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
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
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={updateMutation.isPending}
                className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">{t('deleteDialog.title')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('deleteDialog.description', { name: deleteProject.name })}</p>
            <p className="mt-3 text-xs text-gray-500">{t('deleteDialog.confirmNameHint', { name: deleteProject.name })}</p>
            <input
              value={deleteConfirmationName}
              onChange={(event) => setDeleteConfirmationName(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              placeholder={t('deleteDialog.confirmNamePlaceholder')}
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteProject(null);
                  setDeleteConfirmationName('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteProject.id)}
                disabled={deleteMutation.isPending || deleteConfirmationName.trim() !== deleteProject.name}
                className="rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">{t('linkDialog.title')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('linkDialog.description', { name: linkProject.name })}</p>

            <label className="mt-4 block space-y-1">
              <span className="text-xs text-gray-500">{t('linkDialog.target')}</span>
              <select
                value={selectedLinkTargetId}
                onChange={(event) => setSelectedLinkTargetId(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
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
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitLinkTarget}
                disabled={linkTargetMutation.isPending || !selectedLinkTargetId}
                className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">{t('unlinkDialog.title')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('unlinkDialog.description')}</p>

            <label className="mt-4 block space-y-1">
              <span className="text-xs text-gray-500">{t('unlinkDialog.target')}</span>
              <select
                value={selectedUnlinkTargetId}
                onChange={(event) => setSelectedUnlinkTargetId(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
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
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="button"
                onClick={submitUnlinkTarget}
                disabled={unlinkTargetMutation.isPending || !selectedUnlinkTargetId}
                className="rounded-lg border border-amber-600 bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
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
