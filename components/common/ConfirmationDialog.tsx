'use client';

import { useEffect, useState } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/scans/ui';

type ConfirmationDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending?: boolean;
  warningMessage?: string;
  confirmationKeyword?: string;
  confirmationPrompt?: string;
  confirmationPlaceholder?: string;
};

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  isPending = false,
  warningMessage,
  confirmationKeyword,
  confirmationPrompt,
  confirmationPlaceholder,
}: ConfirmationDialogProps) {
  const [typedKeyword, setTypedKeyword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedKeyword('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const requiresKeyword = Boolean(confirmationKeyword);
  const isKeywordValid = !requiresKeyword || typedKeyword.trim() === confirmationKeyword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-red-50 p-2 text-red-600">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
              {warningMessage && (
                <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {warningMessage}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={cancelLabel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {requiresKeyword && (
          <div className="mt-4 space-y-1">
            {confirmationPrompt && <p className="text-xs font-medium text-gray-600">{confirmationPrompt}</p>}
            <input
              value={typedKeyword}
              onChange={(event) => setTypedKeyword(event.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              placeholder={confirmationPlaceholder || confirmationKeyword}
              autoComplete="off"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={isPending || !isKeywordValid}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
