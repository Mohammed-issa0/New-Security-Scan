'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { ApiRequestError } from '@/lib/api/client';
import { scansService } from '@/lib/scans/scansService';
import { parseAddCreditsError } from '@/lib/scans/errorMessages';
import { scanQueueEstimateQueryKey } from '@/lib/scans/useScanQueueEstimate';
import { Button, Alert } from './ui';

interface AddCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: string;
  creditBudget: number;
  remainingCredits: number;
  maxRuntimeMinutes?: number;
  toolName?: string;
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label="Close dialog"
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    />
  );
}

export function AddCreditsDialog({
  isOpen,
  onClose,
  scanId,
  creditBudget,
  remainingCredits,
  maxRuntimeMinutes = 60,
  toolName,
}: AddCreditsDialogProps) {
  const t = useTranslations('landing.scans.addCredits');
  const tQueue = useTranslations('landing.scans.queueEstimate');
  const titleId = useId();
  const queryClient = useQueryClient();

  const maxAdditional = Math.min(4 - creditBudget, remainingCredits, 3);
  const options = useMemo(
    () => Array.from({ length: maxAdditional }, (_, index) => index + 1),
    [maxAdditional]
  );

  const [additionalCredits, setAdditionalCredits] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setAdditionalCredits(options[0] ?? 1);
    }
  }, [isOpen, options]);

  const newBudget = creditBudget + additionalCredits;
  const newMaxRuntimeMinutes = maxRuntimeMinutes * newBudget;
  const isZap = toolName?.toLowerCase() === 'zap';

  const mutation = useMutation({
    mutationFn: () =>
      scansService.addCreditsToScan(scanId, { additionalCredits }),
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['plans-active'] });
      queryClient.invalidateQueries({ queryKey: scanQueueEstimateQueryKey(scanId) });

      const estimate = await scansService.getQueueEstimate(scanId);
      if (estimate?.estimatedFinishAt) {
        const finishTime = new Date(estimate.estimatedFinishAt).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        });
        toast.success(tQueue('creditsAddedFinish', { time: finishTime }));
      } else {
        toast.success(
          t('success', {
            count: additionalCredits,
            budget: response.newCreditBudget,
          })
        );
      }

      onClose();
    },
    onError: (error: unknown) => {
      const parsed =
        error instanceof ApiRequestError
          ? parseAddCreditsError(error.data, error.message)
          : parseAddCreditsError(undefined, error instanceof Error ? error.message : undefined);

      if (parsed.action === 'toast_refund') {
        toast.message(t('refundToast'));
        queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
        onClose();
        return;
      }

      toast.error(parsed.message);
    },
  });

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

  if (maxAdditional <= 0) {
    return null;
  }

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
            aria-labelledby={titleId}
          >
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-cyan-300" />
                <h2 id={titleId} className="text-lg font-bold text-text-primary">
                  {t('title')}
                </h2>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{t('description')}</p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const selected = additionalCredits === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAdditionalCredits(option)}
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                        selected
                          ? 'border-cyan-300 bg-cyan-400/20 text-cyan-200'
                          : 'border-white/14 bg-white/5 text-text-secondary'
                      }`}
                    >
                      +{option}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-text-secondary space-y-1">
                <p>{t('available', { count: remainingCredits })}</p>
                <p>{t('preview', { budget: newBudget, minutes: newMaxRuntimeMinutes })}</p>
              </div>

              {isZap && (
                <Alert variant="warning">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">{t('zapWarning')}</p>
                  </div>
                </Alert>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
                {t('cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t('confirming') : t('confirm')}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
