'use client';

import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Eye, EyeOff, Globe, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Checkbox, Input, Label } from '@/components/scans/ui';
import type { Target, TargetBrowserAuthRequest } from '@/lib/api/types';

interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateTargetDialogProps extends BaseDialogProps {
  initialUrl?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (url: string) => void;
}

interface DeleteTargetDialogProps extends BaseDialogProps {
  target: Target | null;
  isSubmitting?: boolean;
  onConfirm: (target: Target) => void;
}

interface ViewTargetDialogProps extends BaseDialogProps {
  target: Target | null;
  onConfigureAuth: (target: Target) => void;
}

interface BrowserAuthDialogProps extends BaseDialogProps {
  target: Target | null;
  isSaving?: boolean;
  isDeleting?: boolean;
  onSave: (target: Target, payload: TargetBrowserAuthRequest) => void;
  onDelete: (target: Target) => void;
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      aria-label="Close dialog"
    />
  );
}

function DialogShell({
  children,
  isOpen,
  onClose,
}: BaseDialogProps & { children: React.ReactNode }) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Backdrop onClose={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/12 bg-[rgba(8,16,30,0.98)] shadow-[0_30px_80px_rgba(0,0,0,0.48)]"
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export function CreateTargetDialog({
  isOpen,
  onClose,
  onSubmit,
  initialUrl = '',
  isSubmitting = false,
  errorMessage,
}: CreateTargetDialogProps) {
  const t = useTranslations('landing.targets');
  const inputId = useId();
  const [url, setUrl] = useState(initialUrl);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setValidationError(null);
    }
  }, [initialUrl, isOpen]);

  const validateUrl = (value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return t('validation.required');
    }

    try {
      const parsedUrl = new URL(trimmedValue);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return t('validation.httpOnly');
      }
    } catch {
      return t('validation.invalid');
    }

    return null;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextError = validateUrl(url);
    setValidationError(nextError);

    if (nextError) {
      return;
    }

    onSubmit(url.trim());
  };

  return (
    <DialogShell isOpen={isOpen} onClose={onClose}>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
              {t('createModal.eyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">
              {t('createModal.title')}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{t('createModal.description')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-text-muted transition hover:bg-white/10 hover:text-text-secondary"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4 text-sm text-text-secondary">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/8 p-2 text-cyan-300 shadow-sm">
              <Globe className="h-5 w-5" />
            </div>
            <p>{t('createModal.helper')}</p>
          </div>
        </div>

        <div>
          <Label htmlFor={inputId} required>
            {t('url')}
          </Label>
          <Input
            id={inputId}
            type="url"
            inputMode="url"
            autoFocus
            data-testid="target-url-input"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (validationError) {
                setValidationError(null);
              }
            }}
            placeholder={t('placeholder')}
            aria-invalid={Boolean(validationError || errorMessage)}
          />
          {validationError ? (
            <p className="mt-2 text-sm text-status-danger">{validationError}</p>
          ) : null}
          {!validationError && errorMessage ? (
            <p className="mt-2 text-sm text-status-danger">{errorMessage}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-5">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2" data-testid="target-create-submit">
            {isSubmitting ? t('creating') : t('create')}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

export function DeleteTargetDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  target,
}: DeleteTargetDialogProps) {
  const t = useTranslations('landing.targets');

  return (
    <DialogShell isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-6">
          <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-status-danger/20 bg-status-danger/10 p-3 text-status-danger">
            <TriangleAlert className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary">{t('deleteModal.title')}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {t('deleteModal.description')}
            </p>
            {target ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{t('url')}:</span> {target.url}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-5">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => target && onConfirm(target)}
            disabled={!target || isSubmitting}
          >
            {isSubmitting ? t('deleting') : t('delete')}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}

export function ViewTargetDialog({ isOpen, onClose, onConfigureAuth, target }: ViewTargetDialogProps) {
  const t = useTranslations('landing.targets');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const copyUrl = async () => {
    if (!target) {
      return;
    }

    await navigator.clipboard.writeText(target.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return t('details.notAvailable');
    }

    return new Date(value).toLocaleString();
  };

  return (
    <DialogShell isOpen={isOpen} onClose={onClose}>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
              {t('details.eyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">{t('details.title')}</h2>
            <p className="mt-1 text-sm text-text-muted">{t('details.description')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-text-muted transition hover:bg-white/10 hover:text-text-secondary"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t('url')}
          </p>
          <p className="mt-2 break-all text-sm font-medium text-text-primary">{target?.url ?? t('details.notAvailable')}</p>
          <div className="mt-4">
            <Button type="button" variant="outline" size="sm" onClick={copyUrl} disabled={!target} className="gap-2">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? t('details.copied') : t('details.copyUrl')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t('details.id')}</p>
            <p className="mt-2 break-all text-sm text-text-primary">{target?.id ?? t('details.notAvailable')}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t('browserAuth.statusLabel')}</p>
            <p className="mt-2 text-sm text-text-primary">
              {target?.browserAuthConfigured ? t('browserAuth.statusConfigured') : t('browserAuth.statusNotConfigured')}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t('createdAt')}</p>
            <p className="mt-2 text-sm text-text-primary">{formatDate(target?.createdAt)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{t('details.updatedAt')}</p>
            <p className="mt-2 text-sm text-text-primary">{formatDate(target?.updatedAt)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/8 p-2 text-cyan-300 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{t('browserAuth.cardTitle')}</p>
                <p className="mt-1 text-sm text-text-muted">{t('browserAuth.cardDescription')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => target && onConfigureAuth(target)}
                disabled={!target}
                className="gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                {t('browserAuth.configure')}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 pt-5">
          <Button type="button" onClick={onClose}>{t('close')}</Button>
        </div>
      </div>
    </DialogShell>
  );
}

export function BrowserAuthDialog({
  isOpen,
  onClose,
  target,
  isSaving = false,
  isDeleting = false,
  onSave,
  onDelete,
}: BrowserAuthDialogProps) {
  const t = useTranslations('landing.targets');
  const loginUrlId = useId();
  const targetUrlId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const mfaId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<TargetBrowserAuthRequest>({
    loginUrl: '',
    targetUrl: '',
    username: '',
    password: '',
    mfa: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setShowPassword(false);
    setErrorMessage(null);
    setFormData({
      loginUrl: target?.url ?? '',
      targetUrl: target?.url ?? '',
      username: '',
      password: '',
      mfa: false,
    });
  }, [isOpen, target]);

  const validateOptionalUrl = (value?: string | null) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
      return null;
    }

    try {
      const parsedUrl = new URL(trimmedValue);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return t('validation.httpOnly');
      }
    } catch {
      return t('validation.invalid');
    }

    return null;
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) {
      return;
    }

    const loginUrlError = validateOptionalUrl(formData.loginUrl);
    if (loginUrlError) {
      setErrorMessage(`${t('browserAuth.loginUrl')}: ${loginUrlError}`);
      return;
    }

    const targetUrlError = validateOptionalUrl(formData.targetUrl);
    if (targetUrlError) {
      setErrorMessage(`${t('browserAuth.targetUrl')}: ${targetUrlError}`);
      return;
    }

    if (!formData.username?.trim()) {
      setErrorMessage(t('browserAuth.validation.usernameRequired'));
      return;
    }

    if (!formData.password?.trim()) {
      setErrorMessage(t('browserAuth.validation.passwordRequired'));
      return;
    }

    setErrorMessage(null);
    onSave(target, {
      loginUrl: formData.loginUrl?.trim() || null,
      targetUrl: formData.targetUrl?.trim() || null,
      username: formData.username.trim(),
      password: formData.password.trim(),
      mfa: formData.mfa,
    });
  };

  return (
    <DialogShell isOpen={isOpen} onClose={onClose}>
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
              {t('browserAuth.eyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text-primary">{t('browserAuth.title')}</h2>
            <p className="mt-1 text-sm text-text-muted">{t('browserAuth.description')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-text-muted transition hover:bg-white/10 hover:text-text-secondary"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 px-6 py-6">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4 text-sm text-text-secondary">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/8 p-2 text-cyan-300 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p>{t('browserAuth.helper')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={loginUrlId}>{t('browserAuth.loginUrl')}</Label>
            <Input
              id={loginUrlId}
              type="url"
              value={formData.loginUrl ?? ''}
              onChange={(event) => setFormData((current) => ({ ...current, loginUrl: event.target.value }))}
              placeholder={target?.url ?? t('placeholder')}
            />
          </div>
          <div>
            <Label htmlFor={targetUrlId}>{t('browserAuth.targetUrl')}</Label>
            <Input
              id={targetUrlId}
              type="url"
              value={formData.targetUrl ?? ''}
              onChange={(event) => setFormData((current) => ({ ...current, targetUrl: event.target.value }))}
              placeholder={target?.url ?? t('placeholder')}
            />
          </div>
          <div>
            <Label htmlFor={usernameId} required>{t('browserAuth.username')}</Label>
            <Input
              id={usernameId}
              value={formData.username ?? ''}
              onChange={(event) => setFormData((current) => ({ ...current, username: event.target.value }))}
              autoComplete="username"
              placeholder={t('browserAuth.usernamePlaceholder')}
            />
          </div>
          <div>
            <Label htmlFor={passwordId} required>{t('browserAuth.password')}</Label>
            <div className="relative">
              <Input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                value={formData.password ?? ''}
                onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                autoComplete="current-password"
                placeholder={t('browserAuth.passwordPlaceholder')}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted transition hover:text-text-secondary"
                aria-label={showPassword ? t('browserAuth.hidePassword') : t('browserAuth.showPassword')}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <label htmlFor={mfaId} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Checkbox
            id={mfaId}
            checked={formData.mfa}
            onChange={(event) => setFormData((current) => ({ ...current, mfa: event.target.checked }))}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">{t('browserAuth.mfa')}</p>
            <p className="mt-1 text-sm text-text-muted">{t('browserAuth.mfaDescription')}</p>
          </div>
        </label>

        {errorMessage ? <p className="text-sm text-status-danger">{errorMessage}</p> : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="danger"
            onClick={() => target && onDelete(target)}
            disabled={!target || !target.browserAuthConfigured || isSaving || isDeleting}
          >
            {isDeleting ? t('browserAuth.deleting') : t('browserAuth.delete')}
          </Button>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSaving || isDeleting}>
              {isSaving ? t('browserAuth.saving') : t('browserAuth.save')}
            </Button>
          </div>
        </div>
      </form>
    </DialogShell>
  );
}
