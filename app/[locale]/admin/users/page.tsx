'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { adminService } from '@/lib/admin/adminService';
import { Badge, Button, Card, CardContent, CardHeader, Checkbox, Input, Label } from '@/components/scans/ui';
import { Eye, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import type { AdminUser } from '@/lib/admin/types';
import { toast } from 'sonner';

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  isActive: boolean;
};

const INITIAL_FORM: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  isActive: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateUserForm(form: UserFormState, isEdit: boolean, t: ReturnType<typeof useTranslations<'admin.users'>>) {
  const errors: Partial<Record<keyof UserFormState, string>> = {};

  if (!form.fullName.trim()) {
    errors.fullName = t('validation.nameRequired');
  }

  if (!form.email.trim()) {
    errors.email = t('validation.emailRequired');
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = t('validation.emailInvalid');
  }

  const password = form.password.trim();
  if (!isEdit && !password) {
    errors.password = t('validation.passwordRequired');
  } else if (password && password.length < 8) {
    errors.password = t('validation.passwordMinLength');
  }

  return errors;
}

function UserFormDialog({
  isOpen,
  title,
  submitLabel,
  cancelLabel,
  form,
  errors,
  isPending,
  isEdit,
  onChange,
  onSubmit,
  onClose,
  t,
}: {
  isOpen: boolean;
  title: string;
  submitLabel: string;
  cancelLabel: string;
  form: UserFormState;
  errors: Partial<Record<keyof UserFormState, string>>;
  isPending: boolean;
  isEdit: boolean;
  onChange: (next: UserFormState) => void;
  onSubmit: () => void;
  onClose: () => void;
  t: ReturnType<typeof useTranslations<'admin.users'>>;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={cancelLabel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="admin-user-fullname" required>{t('form.fullName')}</Label>
            <Input
              id="admin-user-fullname"
              value={form.fullName}
              onChange={(event) => onChange({ ...form, fullName: event.target.value })}
              placeholder={t('form.fullNamePlaceholder')}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
          </div>

          <div>
            <Label htmlFor="admin-user-email" required>{t('form.email')}</Label>
            <Input
              id="admin-user-email"
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
              placeholder={t('form.emailPlaceholder')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="admin-user-password" required={!isEdit}>{t('form.password')}</Label>
            <Input
              id="admin-user-password"
              type="password"
              value={form.password}
              onChange={(event) => onChange({ ...form, password: event.target.value })}
              placeholder={isEdit ? t('form.passwordPlaceholderEdit') : t('form.passwordPlaceholderCreate')}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="admin-user-is-active"
              checked={form.isActive}
              onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
            />
            <Label htmlFor="admin-user-is-active" className="mb-0">{t('form.isActive')}</Label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="primary" onClick={onSubmit} disabled={isPending}>
            {isPending ? t('actions.saving') : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const locale = useLocale();
  const t = useTranslations('admin.users');
  const tCommon = useTranslations('common.states');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [createForm, setCreateForm] = useState<UserFormState>(INITIAL_FORM);
  const [editForm, setEditForm] = useState<UserFormState>(INITIAL_FORM);
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof UserFormState, string>>>({});
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof UserFormState, string>>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => adminService.users.list(page, 50),
  });

  const users = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  const pageSummary = useMemo(
    () => t('pagination', { page, totalPages, total: totalCount, from: startIndex, to: endIndex }),
    [t, page, totalPages, totalCount, startIndex, endIndex],
  );

  const createMutation = useMutation({
    mutationFn: () =>
      adminService.users.create({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        isActive: createForm.isActive,
      }),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setCreateForm(INITIAL_FORM);
      setCreateErrors({});
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(t('messages.createSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => adminService.users.update(id, payload),
    onSuccess: async () => {
      setEditUser(null);
      setEditForm(INITIAL_FORM);
      setEditErrors({});
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      if (editUser?.id) {
        await queryClient.invalidateQueries({ queryKey: ['admin-user', editUser.id] });
      }
      toast.success(t('messages.updateSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.users.delete(id),
    onSuccess: async () => {
      setDeleteUser(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(t('messages.deleteSuccess'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('messages.deleteError'));
    },
  });

  const openCreate = () => {
    setCreateForm(INITIAL_FORM);
    setCreateErrors({});
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    if (createMutation.isPending) {
      return;
    }
    setIsCreateOpen(false);
    setCreateErrors({});
  };

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditErrors({});
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      password: '',
      isActive: !!user.isActive,
    });
  };

  const closeEdit = () => {
    if (updateMutation.isPending) {
      return;
    }
    setEditUser(null);
    setEditErrors({});
  };

  const submitCreate = () => {
    const errors = validateUserForm(createForm, false, t);
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    createMutation.mutate();
  };

  const submitEdit = () => {
    if (!editUser) {
      return;
    }
    const errors = validateUserForm(editForm, true, t);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    updateMutation.mutate({
      id: editUser.id,
      payload: {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        isActive: editForm.isActive,
        ...(editForm.password.trim() ? { password: editForm.password } : {}),
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t('title')}
          description={t('subtitle')}
          icon={UserPlus}
        >
          <Button variant="primary" size="sm" onClick={openCreate}>
            {t('actions.create')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('columns.id')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('columns.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('columns.email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('columns.roles')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('columns.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('columns.createdAt')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('columns.lastLogin')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <TableSkeletonRows columns={8} />
                ) : isError ? (
                  <TableErrorRow
                    columns={8}
                    title={error instanceof Error ? error.message : tCommon('error')}
                    retryLabel={tCommon('retry')}
                    onRetry={() => refetch()}
                  />
                ) : users.length === 0 ? (
                  <TableEmptyRow columns={8} title={t('empty')} />
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{user.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.fullName || t('unknown')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.roles && user.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <Badge key={role} variant="outline">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.isActive ? (
                          <Badge variant="success">{t('status.active')}</Badge>
                        ) : (
                          <Badge variant="error">{t('status.inactive')}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/${locale}/admin/users/${user.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <Eye size={16} />
                          {t('actions.view')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="ms-3 inline-flex items-center gap-1 text-amber-600 hover:text-amber-800"
                        >
                          <Pencil size={16} />
                          {t('actions.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteUser(user)}
                          className="ms-3 inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                          {t('actions.delete')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-gray-500">
              {pageSummary}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {t('actions.prev')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() => setPage((prev) => prev + 1)}
              >
                {t('actions.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <UserFormDialog
        isOpen={isCreateOpen}
        title={t('dialogs.createTitle')}
        submitLabel={t('actions.create')}
        cancelLabel={t('actions.cancel')}
        form={createForm}
        errors={createErrors}
        isPending={createMutation.isPending}
        isEdit={false}
        onChange={setCreateForm}
        onSubmit={submitCreate}
        onClose={closeCreate}
        t={t}
      />

      <UserFormDialog
        isOpen={!!editUser}
        title={t('dialogs.editTitle')}
        submitLabel={t('actions.save')}
        cancelLabel={t('actions.cancel')}
        form={editForm}
        errors={editErrors}
        isPending={updateMutation.isPending}
        isEdit={true}
        onChange={setEditForm}
        onSubmit={submitEdit}
        onClose={closeEdit}
        t={t}
      />

      <ConfirmationDialog
        isOpen={!!deleteUser}
        title={t('dialogs.deleteTitle')}
        description={t('dialogs.deleteDescription', {
          name: deleteUser?.fullName || deleteUser?.email || deleteUser?.id || '-',
        })}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteUser(null);
          }
        }}
        onConfirm={() => {
          if (deleteUser) {
            deleteMutation.mutate(deleteUser.id);
          }
        }}
      />
    </div>
  );
}
