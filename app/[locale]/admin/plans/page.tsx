'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, Badge, Button, Input, Label, Textarea } from '@/components/scans/ui';
import { Eye, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { adminService } from '@/lib/admin/adminService';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import type {
  PlanDefinitionBody,
  PlanDefinitionResponse,
  UpdateUserPlanRequest,
  UserPlanDetailResponse,
  UserPlanListResponse,
} from '@/lib/admin/types';

const PLAN_DEFINITIONS_PAGE_SIZE = 8;

type EditorMode = 'create' | 'edit';

type UserPlanFormState = {
  status: string;
  expiresAt: string;
  includedCredits: string;
  includedCreditsUsed: string;
  extraPurchaseCount: string;
};

const normalizePlanName = (name: string) => name.trim();

const formatDefinitionJson = (definitionJson?: string | null) => {
  if (!definitionJson || !definitionJson.trim()) {
    return '{}';
  }

  try {
    return JSON.stringify(JSON.parse(definitionJson), null, 2);
  } catch {
    return definitionJson;
  }
};

const parseDefinitionJson = (rawJson: string) => {
  const parsed = JSON.parse(rawJson) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_PLAN_JSON_OBJECT');
  }
  return parsed as PlanDefinitionBody;
};

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const normalizeUserPlanStatus = (status: string | number | null | undefined): string => {
  if (status === 1 || String(status).toLowerCase() === 'active') {
    return '1';
  }
  if (status === 2 || String(status).toLowerCase() === 'expired') {
    return '2';
  }
  if (status === 3 || String(status).toLowerCase() === 'canceled' || String(status).toLowerCase() === 'cancelled') {
    return '3';
  }
  return '';
};

const buildUserPlanForm = (plan: UserPlanListResponse): UserPlanFormState => ({
  status: normalizeUserPlanStatus(plan.status),
  expiresAt: toLocalDateTimeInput(plan.expiresAt),
  includedCredits: plan.includedCredits !== undefined && plan.includedCredits !== null ? String(plan.includedCredits) : '',
  includedCreditsUsed:
    plan.includedCreditsUsed !== undefined && plan.includedCreditsUsed !== null ? String(plan.includedCreditsUsed) : '',
  extraPurchaseCount:
    plan.extraPurchaseCount !== undefined && plan.extraPurchaseCount !== null ? String(plan.extraPurchaseCount) : '',
});

export default function AdminPlansPage() {
  const t = useTranslations('admin.plans');
  const tCommon = useTranslations('common.states');
  const tCommonButtons = useTranslations('common.buttons');
  const tCommonConfirmation = useTranslations('common.confirmation');
  const queryClient = useQueryClient();

  const [definitionsPage, setDefinitionsPage] = useState(1);
  const [page, setPage] = useState(1);
  const [viewPlan, setViewPlan] = useState<PlanDefinitionResponse | null>(null);
  const [viewUserPlanId, setViewUserPlanId] = useState<string | null>(null);

  const [editUserPlan, setEditUserPlan] = useState<UserPlanListResponse | null>(null);
  const [editUserPlanForm, setEditUserPlanForm] = useState<UserPlanFormState | null>(null);
  const [editUserPlanError, setEditUserPlanError] = useState<string | null>(null);

  const [deleteUserPlan, setDeleteUserPlan] = useState<UserPlanListResponse | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [planNameInput, setPlanNameInput] = useState('');
  const [definitionJsonInput, setDefinitionJsonInput] = useState('{}');
  const [editorError, setEditorError] = useState<string | null>(null);

  const [planToDelete, setPlanToDelete] = useState<PlanDefinitionResponse | null>(null);

  const {
    data: planDefinitions,
    isLoading: plansLoading,
    isError: isPlansError,
    error: plansError,
    refetch: refetchPlans,
  } = useQuery({
    queryKey: ['admin-plan-definitions'],
    queryFn: () => adminService.plans.list(),
  });

  const {
    data: userPlans,
    isLoading: userPlansLoading,
    isError: isUserPlansError,
    error: userPlansError,
    refetch: refetchUserPlans,
  } = useQuery({
    queryKey: ['admin-user-plans', page],
    queryFn: () => adminService.plans.userPlans.list(page, 50),
  });

  const {
    data: viewUserPlan,
    isLoading: viewUserPlanLoading,
    isError: isViewUserPlanError,
    error: viewUserPlanError,
    refetch: refetchViewUserPlan,
  } = useQuery({
    queryKey: ['admin-user-plan', viewUserPlanId],
    queryFn: () => adminService.plans.userPlans.get(viewUserPlanId as string),
    enabled: Boolean(viewUserPlanId),
  });

  const definitions = planDefinitions ?? [];

  const totalDefinitionPages = Math.max(1, Math.ceil(definitions.length / PLAN_DEFINITIONS_PAGE_SIZE));

  useEffect(() => {
    if (definitionsPage > totalDefinitionPages) {
      setDefinitionsPage(totalDefinitionPages);
    }
  }, [definitionsPage, totalDefinitionPages]);

  const visibleDefinitions = useMemo(() => {
    const start = (definitionsPage - 1) * PLAN_DEFINITIONS_PAGE_SIZE;
    return definitions.slice(start, start + PLAN_DEFINITIONS_PAGE_SIZE);
  }, [definitions, definitionsPage]);

  const upsertPlanMutation = useMutation({
    mutationFn: ({ planName, payload, mode }: { planName: string; payload: PlanDefinitionBody; mode: EditorMode }) =>
      mode === 'create' ? adminService.plans.create(planName, payload) : adminService.plans.update(planName, payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-plan-definitions'] });
      setIsEditorOpen(false);
      setPlanNameInput('');
      setDefinitionJsonInput('{}');
      setEditorError(null);
      toast.success(
        variables.mode === 'create' ? t('definitions.messages.createSuccess') : t('definitions.messages.updateSuccess')
      );
    },
    onError: (error: any, variables) => {
      toast.error(
        error?.message ||
          (variables.mode === 'create' ? t('definitions.messages.createError') : t('definitions.messages.updateError'))
      );
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planName: string) => adminService.plans.delete(planName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-plan-definitions'] });
      setPlanToDelete(null);
      toast.success(t('definitions.messages.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('definitions.messages.deleteError'));
    },
  });

  const updateUserPlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPlanRequest }) =>
      adminService.plans.userPlans.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-user-plans'] });
      if (viewUserPlanId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-user-plan', viewUserPlanId] });
      }
      setEditUserPlan(null);
      setEditUserPlanForm(null);
      setEditUserPlanError(null);
      toast.success(t('userPlans.messages.updateSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('userPlans.messages.updateError'));
    },
  });

  const deleteUserPlanMutation = useMutation({
    mutationFn: (id: string) => adminService.plans.userPlans.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-user-plans'] });
      if (viewUserPlanId === deleteUserPlan?.id) {
        setViewUserPlanId(null);
      }
      setDeleteUserPlan(null);
      toast.success(t('userPlans.messages.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('userPlans.messages.deleteError'));
    },
  });

  const openCreateEditor = () => {
    setEditorMode('create');
    setPlanNameInput('');
    setDefinitionJsonInput('{}');
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const openEditEditor = (plan: PlanDefinitionResponse) => {
    setEditorMode('edit');
    setPlanNameInput(plan.planName || '');
    setDefinitionJsonInput(formatDefinitionJson(plan.definitionJson));
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const submitEditor = () => {
    const normalizedName = normalizePlanName(planNameInput);
    if (!normalizedName) {
      setEditorError(t('definitions.validation.planNameRequired'));
      return;
    }

    let payload: PlanDefinitionBody;
    try {
      payload = parseDefinitionJson(definitionJsonInput);
    } catch {
      setEditorError(t('definitions.validation.invalidJson'));
      return;
    }

    if (!payload.plan_name || String(payload.plan_name).trim() === '') {
      payload.plan_name = normalizedName;
    }

    if (String(payload.plan_name).trim() !== normalizedName) {
      setEditorError(t('definitions.validation.planNameMismatch'));
      return;
    }

    setEditorError(null);
    upsertPlanMutation.mutate({
      planName: normalizedName,
      payload,
      mode: editorMode,
    });
  };

  const openEditUserPlan = (plan: UserPlanListResponse) => {
    setEditUserPlan(plan);
    setEditUserPlanForm(buildUserPlanForm(plan));
    setEditUserPlanError(null);
  };

  const submitEditUserPlan = () => {
    if (!editUserPlan || !editUserPlanForm) {
      return;
    }

    const statusNumber = Number(editUserPlanForm.status);
    if (![1, 2, 3].includes(statusNumber)) {
      setEditUserPlanError(t('userPlans.validation.statusRequired'));
      return;
    }

    const parseNonNegativeInt = (value: string, errorKey: string) => {
      if (!value.trim()) {
        return null;
      }
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(errorKey);
      }
      return parsed;
    };

    let includedCredits: number | null;
    let includedCreditsUsed: number | null;
    let extraPurchaseCount: number | null;

    try {
      includedCredits = parseNonNegativeInt(editUserPlanForm.includedCredits, 'invalidIncludedCredits');
      includedCreditsUsed = parseNonNegativeInt(editUserPlanForm.includedCreditsUsed, 'invalidIncludedCreditsUsed');
      extraPurchaseCount = parseNonNegativeInt(editUserPlanForm.extraPurchaseCount, 'invalidExtraPurchaseCount');
    } catch (error) {
      const key = (error as Error).message;
      setEditUserPlanError(t(`userPlans.validation.${key}`));
      return;
    }

    if (
      includedCredits !== null &&
      includedCreditsUsed !== null &&
      includedCreditsUsed > includedCredits
    ) {
      setEditUserPlanError(t('userPlans.validation.usedMoreThanIncluded'));
      return;
    }

    let expiresAt: string | null = null;
    if (editUserPlanForm.expiresAt.trim()) {
      const parsedDate = new Date(editUserPlanForm.expiresAt);
      if (Number.isNaN(parsedDate.getTime())) {
        setEditUserPlanError(t('userPlans.validation.invalidExpiry'));
        return;
      }
      expiresAt = parsedDate.toISOString();
    }

    setEditUserPlanError(null);
    updateUserPlanMutation.mutate({
      id: editUserPlan.id,
      payload: {
        status: statusNumber,
        expiresAt,
        includedCredits,
        includedCreditsUsed,
        extraPurchaseCount,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('title')} description={t('subtitle')} icon={Layers}>
          <Button type="button" size="sm" onClick={openCreateEditor} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('definitions.actions.create')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('definitions.columns.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('definitions.columns.updatedAt')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('definitions.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plansLoading ? (
                  <TableSkeletonRows columns={3} />
                ) : isPlansError ? (
                  <TableErrorRow
                    columns={3}
                    title={plansError instanceof Error ? plansError.message : tCommon('error')}
                    retryLabel={tCommon('retry')}
                    onRetry={() => refetchPlans()}
                  />
                ) : !planDefinitions || planDefinitions.length === 0 ? (
                  <TableEmptyRow columns={3} title={t('definitions.empty')} />
                ) : (
                  visibleDefinitions.map((plan) => (
                    <tr key={plan.planName || 'unknown'} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {plan.planName || t('definitions.unknown')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {plan.updatedAt ? new Date(plan.updatedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => setViewPlan(plan)} className="gap-1">
                            <Eye className="h-4 w-4" />
                            {t('definitions.actions.view')}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openEditEditor(plan)} className="gap-1">
                            <Pencil className="h-4 w-4" />
                            {t('definitions.actions.edit')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => setPlanToDelete(plan)}
                            className="gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('definitions.actions.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!plansLoading && !isPlansError && definitions.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-xs text-gray-500">
                {t('definitions.pagination', {
                  page: definitionsPage,
                  totalPages: totalDefinitionPages,
                  total: definitions.length,
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={definitionsPage <= 1}
                  onClick={() => setDefinitionsPage((prev) => Math.max(1, prev - 1))}
                >
                  {t('definitions.actions.prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={definitionsPage >= totalDefinitionPages}
                  onClick={() => setDefinitionsPage((prev) => Math.min(totalDefinitionPages, prev + 1))}
                >
                  {t('definitions.actions.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t('userPlans.title')} description={t('userPlans.subtitle')} icon={Layers} />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('userPlans.columns.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('userPlans.columns.plan')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('userPlans.columns.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('userPlans.columns.expiresAt')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('userPlans.columns.credits')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('userPlans.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userPlansLoading ? (
                  <TableSkeletonRows columns={6} />
                ) : isUserPlansError ? (
                  <TableErrorRow
                    columns={6}
                    title={userPlansError instanceof Error ? userPlansError.message : tCommon('error')}
                    retryLabel={tCommon('retry')}
                    onRetry={() => refetchUserPlans()}
                  />
                ) : !userPlans?.items || userPlans.items.length === 0 ? (
                  <TableEmptyRow columns={6} title={t('userPlans.empty')} />
                ) : (
                  userPlans.items.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {plan.userEmail || plan.userFullName || plan.userId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {plan.planName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant="outline">{plan.status ?? '-'}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {plan.expiresAt ? new Date(plan.expiresAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {plan.includedCreditsUsed ?? 0}/{plan.includedCredits ?? 0}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setViewUserPlanId(plan.id)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {t('userPlans.actions.view')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditUserPlan(plan)}
                            className="gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            {t('userPlans.actions.edit')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteUserPlan(plan)}
                            className="gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('userPlans.actions.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-gray-500">
              {t('userPlans.pagination', { page, total: userPlans?.totalCount ?? 0 })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {t('userPlans.actions.prev')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(userPlans?.pageNumber ?? 1) * (userPlans?.pageSize ?? 50) >= (userPlans?.totalCount ?? 0)}
                onClick={() => setPage((prev) => prev + 1)}
              >
                {t('userPlans.actions.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewPlan(null)}>
          <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('definitions.details.title')}</h3>
              <button
                type="button"
                onClick={() => setViewPlan(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label={tCommonButtons('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-sm text-gray-600">{viewPlan.planName || t('definitions.unknown')}</p>
            <pre className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs leading-6 text-gray-800">
              {formatDefinitionJson(viewPlan.definitionJson)}
            </pre>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setViewPlan(null)}>
                {tCommonButtons('close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !upsertPlanMutation.isPending && setIsEditorOpen(false)}>
          <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">
              {editorMode === 'create' ? t('definitions.editor.createTitle') : t('definitions.editor.editTitle')}
            </h3>
            <p className="mt-1 text-sm text-gray-600">{t('definitions.editor.description')}</p>

            <div className="mt-4 space-y-4">
              <div>
                <Label required htmlFor="plan-name-input">{t('definitions.editor.planName')}</Label>
                <Input
                  id="plan-name-input"
                  value={planNameInput}
                  onChange={(event) => setPlanNameInput(event.target.value)}
                  disabled={editorMode === 'edit' || upsertPlanMutation.isPending}
                  placeholder={t('definitions.editor.planNamePlaceholder')}
                />
              </div>
              <div>
                <Label required htmlFor="plan-json-input">{t('definitions.editor.jsonLabel')}</Label>
                <Textarea
                  id="plan-json-input"
                  value={definitionJsonInput}
                  onChange={(event) => setDefinitionJsonInput(event.target.value)}
                  rows={16}
                  className="font-mono text-xs"
                  placeholder={t('definitions.editor.jsonPlaceholder')}
                  disabled={upsertPlanMutation.isPending}
                />
              </div>
              {editorError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editorError}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditorOpen(false)}
                disabled={upsertPlanMutation.isPending}
              >
                {tCommonConfirmation('cancel')}
              </Button>
              <Button type="button" onClick={submitEditor} disabled={upsertPlanMutation.isPending}>
                {upsertPlanMutation.isPending
                  ? t('definitions.editor.saving')
                  : editorMode === 'create'
                    ? t('definitions.editor.createAction')
                    : t('definitions.editor.saveAction')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={Boolean(planToDelete)}
        title={t('definitions.delete.title')}
        description={t('definitions.delete.description', { name: planToDelete?.planName || t('definitions.unknown') })}
        warningMessage={t('definitions.delete.warning')}
        confirmLabel={t('definitions.actions.delete')}
        cancelLabel={tCommonConfirmation('cancel')}
        onClose={() => !deletePlanMutation.isPending && setPlanToDelete(null)}
        onConfirm={() => {
          if (!planToDelete?.planName) {
            return;
          }
          deletePlanMutation.mutate(planToDelete.planName);
        }}
        isPending={deletePlanMutation.isPending}
      />

      {viewUserPlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewUserPlanId(null)}>
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('userPlans.details.title')}</h3>
              <button
                type="button"
                onClick={() => setViewUserPlanId(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label={tCommonButtons('close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {viewUserPlanLoading ? (
              <p className="text-sm text-gray-600">{t('userPlans.details.loading')}</p>
            ) : isViewUserPlanError ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600">
                  {viewUserPlanError instanceof Error ? viewUserPlanError.message : t('userPlans.details.loadError')}
                </p>
                <Button variant="outline" type="button" onClick={() => refetchViewUserPlan()}>
                  {tCommon('retry')}
                </Button>
              </div>
            ) : !viewUserPlan ? (
              <p className="text-sm text-gray-600">{t('userPlans.details.notFound')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.id')}</p>
                  <p className="text-sm text-gray-900 break-all">{viewUserPlan.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.userId')}</p>
                  <p className="text-sm text-gray-900 break-all">{viewUserPlan.userId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.user')}</p>
                  <p className="text-sm text-gray-900">{viewUserPlan.userEmail || viewUserPlan.userFullName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.plan')}</p>
                  <p className="text-sm text-gray-900">{viewUserPlan.planName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.status')}</p>
                  <p className="text-sm text-gray-900">
                    {normalizeUserPlanStatus(viewUserPlan.status) === '1'
                      ? t('userPlans.status.active')
                      : normalizeUserPlanStatus(viewUserPlan.status) === '2'
                        ? t('userPlans.status.expired')
                        : normalizeUserPlanStatus(viewUserPlan.status) === '3'
                          ? t('userPlans.status.canceled')
                          : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.purchasedAt')}</p>
                  <p className="text-sm text-gray-900">{viewUserPlan.purchasedAt ? new Date(viewUserPlan.purchasedAt).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.expiresAt')}</p>
                  <p className="text-sm text-gray-900">{viewUserPlan.expiresAt ? new Date(viewUserPlan.expiresAt).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.credits')}</p>
                  <p className="text-sm text-gray-900">{viewUserPlan.includedCreditsUsed ?? 0}/{viewUserPlan.includedCredits ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('userPlans.details.fields.extraPurchaseCount')}</p>
                  <p className="text-sm text-gray-900">{viewUserPlan.extraPurchaseCount ?? 0}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setViewUserPlanId(null)}>
                {tCommonButtons('close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editUserPlan && editUserPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !updateUserPlanMutation.isPending && setEditUserPlan(null)}>
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">{t('userPlans.editor.title')}</h3>
            <p className="mt-1 text-sm text-gray-600">{t('userPlans.editor.description')}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label required htmlFor="user-plan-status">{t('userPlans.editor.status')}</Label>
                <select
                  id="user-plan-status"
                  value={editUserPlanForm.status}
                  onChange={(event) => setEditUserPlanForm((prev) => (prev ? { ...prev, status: event.target.value } : prev))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  disabled={updateUserPlanMutation.isPending}
                >
                  <option value="">{t('userPlans.editor.statusPlaceholder')}</option>
                  <option value="1">{t('userPlans.status.active')}</option>
                  <option value="2">{t('userPlans.status.expired')}</option>
                  <option value="3">{t('userPlans.status.canceled')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="user-plan-expiry">{t('userPlans.editor.expiresAt')}</Label>
                <Input
                  id="user-plan-expiry"
                  type="datetime-local"
                  value={editUserPlanForm.expiresAt}
                  onChange={(event) => setEditUserPlanForm((prev) => (prev ? { ...prev, expiresAt: event.target.value } : prev))}
                  disabled={updateUserPlanMutation.isPending}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="user-plan-credits">{t('userPlans.editor.includedCredits')}</Label>
                <Input
                  id="user-plan-credits"
                  type="number"
                  min={0}
                  step={1}
                  value={editUserPlanForm.includedCredits}
                  onChange={(event) => setEditUserPlanForm((prev) => (prev ? { ...prev, includedCredits: event.target.value } : prev))}
                  disabled={updateUserPlanMutation.isPending}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="user-plan-used-credits">{t('userPlans.editor.includedCreditsUsed')}</Label>
                <Input
                  id="user-plan-used-credits"
                  type="number"
                  min={0}
                  step={1}
                  value={editUserPlanForm.includedCreditsUsed}
                  onChange={(event) => setEditUserPlanForm((prev) => (prev ? { ...prev, includedCreditsUsed: event.target.value } : prev))}
                  disabled={updateUserPlanMutation.isPending}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="user-plan-extra-count">{t('userPlans.editor.extraPurchaseCount')}</Label>
                <Input
                  id="user-plan-extra-count"
                  type="number"
                  min={0}
                  step={1}
                  value={editUserPlanForm.extraPurchaseCount}
                  onChange={(event) => setEditUserPlanForm((prev) => (prev ? { ...prev, extraPurchaseCount: event.target.value } : prev))}
                  disabled={updateUserPlanMutation.isPending}
                />
              </div>
            </div>

            {editUserPlanError && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{editUserPlanError}</p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditUserPlan(null);
                  setEditUserPlanForm(null);
                  setEditUserPlanError(null);
                }}
                disabled={updateUserPlanMutation.isPending}
              >
                {tCommonConfirmation('cancel')}
              </Button>
              <Button type="button" onClick={submitEditUserPlan} disabled={updateUserPlanMutation.isPending}>
                {updateUserPlanMutation.isPending ? t('userPlans.editor.saving') : t('userPlans.actions.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={Boolean(deleteUserPlan)}
        title={t('userPlans.delete.title')}
        description={t('userPlans.delete.description', {
          name: deleteUserPlan?.userEmail || deleteUserPlan?.userFullName || deleteUserPlan?.userId || '-',
        })}
        warningMessage={t('userPlans.delete.warning')}
        confirmLabel={t('userPlans.actions.delete')}
        cancelLabel={tCommonConfirmation('cancel')}
        onClose={() => !deleteUserPlanMutation.isPending && setDeleteUserPlan(null)}
        onConfirm={() => {
          if (!deleteUserPlan?.id) {
            return;
          }
          deleteUserPlanMutation.mutate(deleteUserPlan.id);
        }}
        isPending={deleteUserPlanMutation.isPending}
      />
    </div>
  );
}
