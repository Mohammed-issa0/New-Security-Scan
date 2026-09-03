'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bot, CheckCircle2, Info, Loader2, RefreshCcw, Send, Sparkles, Target, X } from 'lucide-react';

import {
  ActiveGuidedSetupResponse,
  GuidedSetupLanguage,
  GuidedSetupQuestion,
  GuidedSetupStepResponse,
  ScanRecommendation,
  StartGuidedSetupResponse,
} from '@/lib/api/types';
import { ApiRequestError } from '@/lib/api/client';
import { tokenStore } from '@/lib/auth/tokenStore';
import { guidedSetupService } from '@/lib/scans/guidedSetupService';
import {
  inferCreditBudgetFromRecommendation,
  inferProfileFromRecommendation,
} from '@/lib/scans/guidedSetupProfile';
import { Badge, Button, Input } from '@/components/scans/ui';

type ChatRole = 'assistant' | 'user' | 'system';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeQuestion(question?: GuidedSetupQuestion | null): GuidedSetupQuestion | null {
  return question ?? null;
}

// Backend errors carry a localized user-facing `error` plus an untranslated
// diagnostic `message` meant for their logs — only ever show the former.
function extractMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value && typeof value === 'object') {
    const nested = value as Record<string, unknown>;
    const nestedMessage = nested.error ?? nested.detail ?? nested.title;
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage;
    }
  }

  return undefined;
}

function getApiErrorMessage(error: ApiRequestError, fallback: string) {
  const payload = (error.data ?? {}) as Record<string, unknown>;

  return (
    extractMessage(payload.error) ||
    extractMessage(payload.detail) ||
    extractMessage(payload.title) ||
    fallback
  );
}

function isPlanGateError(error: ApiRequestError) {
  const text = `${error.message} ${error.data?.error ?? ''} ${error.data?.detail ?? ''}`.toLowerCase();
  const hasPlanSignal = /(plan|subscription|credit|quota|billing|upgrade|package|باقة|اشتراك|رصيد)/i.test(text);
  return error.status === 402 || error.status === 403 || (error.status === 400 && hasPlanSignal);
}

export function FloatingAssistant() {
  const t = useTranslations('landing.guidedSetup');
  const locale = useLocale();
  const language: GuidedSetupLanguage = locale === 'ar' ? 'ar' : 'en';
  const router = useRouter();
  const initialMessages = React.useMemo<ChatMessage[]>(() => ([
    {
      id: 'intro',
      role: 'assistant',
      content: t('messages.intro'),
    },
  ]), [t]);

  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isBootstrapping, setIsBootstrapping] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [targetUrl, setTargetUrl] = React.useState('');
  const [composerDraft, setComposerDraft] = React.useState('');
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [currentQuestion, setCurrentQuestion] = React.useState<GuidedSetupQuestion | null>(null);
  const [recommendation, setRecommendation] = React.useState<ScanRecommendation | null>(null);
  const [upgradeMessage, setUpgradeMessage] = React.useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = React.useState<string | null>(null);
  const [showSessionDetails, setShowSessionDetails] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setIsAuthenticated(!!tokenStore.getTokens()?.accessToken);
    return tokenStore.subscribe((tokens) => {
      setIsAuthenticated(!!tokens?.accessToken);
    });
  }, []);

  const resetLocalState = React.useCallback(() => {
    setSessionId(null);
    setSessionStatus(null);
    setTargetUrl('');
    setComposerDraft('');
    setMessages(initialMessages);
    setCurrentQuestion(null);
    setRecommendation(null);
    setUpgradeMessage(null);
    setShowSessionDetails(false);
  }, [initialMessages]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setIsOpen(false);
      resetLocalState();
    }
  }, [isAuthenticated, resetLocalState]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, currentQuestion, recommendation, isBusy, isBootstrapping]);

  const appendMessage = React.useCallback((role: ChatRole, content: string) => {
    setMessages((previous) => [...previous, { id: makeId(role), role, content }]);
  }, []);

  // The transcript lives on the server now: each stored answer replays as the
  // question we asked followed by what the user replied.
  const hydrateFromActiveSession = React.useCallback((active: ActiveGuidedSetupResponse) => {
    const transcript: ChatMessage[] = [...initialMessages];

    for (const answer of active.answers ?? []) {
      if (answer.question_text?.trim()) {
        transcript.push({ id: makeId('assistant'), role: 'assistant', content: answer.question_text });
      }
      if (answer.answer?.trim()) {
        transcript.push({ id: makeId('user'), role: 'user', content: answer.answer });
      }
    }

    setSessionId(active.sessionId);
    setSessionStatus(active.status ?? null);
    setTargetUrl(active.targetUrl ?? '');
    setMessages(transcript);
    setCurrentQuestion(normalizeQuestion(active.currentQuestion));
    setRecommendation(active.recommendation ?? null);
    setComposerDraft('');
    setUpgradeMessage(null);
  }, [initialMessages]);

  const loadActiveSession = React.useCallback(async () => {
    setIsBootstrapping(true);
    try {
      const active = await guidedSetupService.getActiveSession();
      if (active?.sessionId) {
        hydrateFromActiveSession(active);
      } else {
        // 204 — nothing saved, so this is a fresh conversation.
        resetLocalState();
      }
    } catch (error) {
      const message = error instanceof ApiRequestError
        ? getApiErrorMessage(error, t('messages.resumeError'))
        : t('messages.resumeError');
      appendMessage('system', message);
    } finally {
      setIsBootstrapping(false);
    }
  }, [appendMessage, hydrateFromActiveSession, resetLocalState, t]);

  // Restore the saved conversation every time the panel is opened.
  React.useEffect(() => {
    if (isOpen && isAuthenticated) {
      void loadActiveSession();
    }
    // loadActiveSession is intentionally omitted: it changes identity with `t`,
    // which would refetch the session on every locale/message change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated]);

  const startNewChat = React.useCallback(() => {
    // Dropping local state is enough: the next send POSTs /guided-setup, which
    // abandons the previous conversation server-side.
    resetLocalState();
  }, [resetLocalState]);

  const startGuidedSetup = React.useCallback(async (firstMessage: string) => {
    const trimmed = firstMessage.trim();
    if (!trimmed) {
      appendMessage('system', t('messages.targetRequired'));
      return;
    }

    setIsBusy(true);
    setUpgradeMessage(null);
    try {
      // targetUrl is optional now — if this is not a URL the wizard asks for one
      // later as a free-text question.
      const response: StartGuidedSetupResponse = await guidedSetupService.startSession({
        targetUrl: trimmed,
        language,
      });

      setSessionId(response.sessionId);
      setTargetUrl(response.targetUrl ?? '');
      setSessionStatus(null);
      setMessages([
        ...initialMessages,
        { id: makeId('user'), role: 'user', content: trimmed },
      ]);
      setCurrentQuestion(normalizeQuestion(response.question));
      setRecommendation(null);
      setComposerDraft('');
    } catch (error) {
      const message = error instanceof ApiRequestError
        ? getApiErrorMessage(error, t('messages.startError'))
        : t('messages.startError');
      appendMessage('system', message);
    } finally {
      setIsBusy(false);
    }
  }, [appendMessage, initialMessages, language, t]);

  const submitAnswer = React.useCallback(async (answer: string) => {
    if (!sessionId || !currentQuestion) {
      return;
    }

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      appendMessage('system', t('messages.answerRequired'));
      return;
    }

    const submittedQuestion = currentQuestion;
    setCurrentQuestion(null);
    appendMessage('user', trimmedAnswer);
    setComposerDraft('');
    setIsBusy(true);
    setUpgradeMessage(null);

    try {
      const response: GuidedSetupStepResponse = await guidedSetupService.submitAnswer(sessionId, {
        questionId: submittedQuestion.question_id,
        questionText: submittedQuestion.text ?? null,
        answer: trimmedAnswer,
        language,
      });

      // Every step echoes the captured target back, including the one the user
      // just supplied mid-conversation.
      if (response.targetUrl) {
        setTargetUrl(response.targetUrl);
      }

      if (response.question) {
        setCurrentQuestion(response.question);
        setRecommendation(null);
      } else if (response.recommendation) {
        setCurrentQuestion(null);
        setRecommendation(response.recommendation);
        appendMessage('assistant', t('messages.recommendationReady'));
      }
    } catch (error) {
      setCurrentQuestion(submittedQuestion);
      const message = error instanceof ApiRequestError
        ? getApiErrorMessage(error, t('messages.answerError'))
        : t('messages.answerError');
      appendMessage('system', message);
    } finally {
      setIsBusy(false);
    }
  }, [appendMessage, currentQuestion, language, sessionId, t]);

  const createScan = React.useCallback(async () => {
    if (!sessionId || !recommendation || recommendation.target_required) {
      return;
    }

    setIsBusy(true);
    setUpgradeMessage(null);
    try {
      const profile = inferProfileFromRecommendation(recommendation);
      const creditBudget = inferCreditBudgetFromRecommendation(recommendation);

      const response = await guidedSetupService.createScanFromRecommendation(sessionId, {
        targetUrl: targetUrl.trim() || undefined,
        profile,
        creditBudget,
      });

      resetLocalState();
      setIsOpen(false);

      if (response.scanId) {
        router.push(`/${locale}/scans/${response.scanId}`);
      } else {
        router.push(`/${locale}/scans`);
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const backendMessage = getApiErrorMessage(error, t('messages.createError'));
        appendMessage('system', backendMessage);

        if (isPlanGateError(error)) {
          setUpgradeMessage(backendMessage || t('upgrade.fallbackMessage'));
        }

        if (error.status === 401) {
          setIsOpen(false);
          return;
        }
      } else {
        appendMessage('system', t('messages.createError'));
      }
    } finally {
      setIsBusy(false);
    }
  }, [appendMessage, locale, recommendation, resetLocalState, router, sessionId, targetUrl, t]);

  const hasRecommendation = !!recommendation;
  const targetRequired = !!recommendation?.target_required;
  const currentQuestionChoices = currentQuestion?.choices?.filter((choice) => Boolean(choice?.label || choice?.value)) ?? [];
  const hasQuestionChoices = currentQuestionChoices.length > 0;
  const showThinking = isBusy;
  const composerMode = !sessionId ? 'start' : currentQuestion ? 'answer' : 'idle';
  const composerPlaceholder = composerMode === 'start' ? t('targetPlaceholder') : t('answerPlaceholder');

  const handleComposerSubmit = React.useCallback(() => {
    if (isBusy) {
      return;
    }

    if (composerMode === 'start') {
      void startGuidedSetup(composerDraft);
      return;
    }

    if (composerMode === 'answer') {
      void submitAnswer(composerDraft);
    }
  }, [composerDraft, composerMode, isBusy, startGuidedSetup, submitAnswer]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(true)}
        aria-label={t('openButton')}
        title={t('openButton')}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-400 text-slate-950 shadow-[0_20px_54px_rgba(0,173,255,0.32)] backdrop-blur-xl transition-all hover:shadow-[0_24px_66px_rgba(0,191,255,0.42)] rtl:right-auto rtl:left-6"
      >
        <Bot size={26} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-end p-4 sm:p-6">
            <motion.button
              aria-label={t('close')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24 }}
              className="relative flex h-[min(86vh,46rem)] w-full max-w-[29rem] flex-col overflow-hidden rounded-[1.6rem] border border-cyan-300/22 bg-[radial-gradient(circle_at_20%_0%,rgba(0,209,255,0.12),rgba(6,12,21,0.97)_35%,rgba(6,12,21,0.99)_100%)] shadow-[0_34px_90px_rgba(0,0,0,0.56)] backdrop-blur-xl sm:max-w-[33rem]"
            >
              <div className="flex items-start justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                <div className="space-y-1">
                  <Badge variant="outline" className="gap-2 border-cyan-300/28 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-cyan-100">
                    <Sparkles size={12} /> {t('badge')}
                  </Badge>
                  <h3 className="text-lg font-black tracking-tight text-text-primary">{t('title')}</h3>
                  <p className="text-sm leading-relaxed text-text-secondary">{t('subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSessionDetails((previous) => !previous)}
                    className="rounded-xl border border-white/12 p-2 text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary"
                    aria-label={t('sessionDetails')}
                    title={t('sessionDetails')}
                  >
                    <Info size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={startNewChat}
                    disabled={isBusy || isBootstrapping}
                    className="rounded-xl border border-white/12 p-2 text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t('newChat')}
                    title={t('newChat')}
                  >
                    {isBootstrapping ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-white/12 p-2 text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary"
                    aria-label={t('close')}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showSessionDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="border-b border-white/10 px-5 pb-4 sm:px-6"
                  >
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-xs text-text-muted">
                      {(sessionId || sessionStatus || targetUrl) ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {sessionId && <div className="sm:col-span-2 break-all"><span className="font-semibold text-text-secondary">{t('sessionLabel')}:</span> {sessionId}</div>}
                          {sessionStatus && <div><span className="font-semibold text-text-secondary">{t('statusLabel')}:</span> {sessionStatus}</div>}
                          {targetUrl && <div className="break-all"><span className="font-semibold text-text-secondary">{t('targetLabel')}:</span> {targetUrl}</div>}
                        </div>
                      ) : (
                        <div className="text-sm text-text-secondary">{t('noSessionDetails')}</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 8, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            message.role === 'user'
                              ? 'bg-cyan-300 text-slate-950'
                              : message.role === 'system'
                                ? 'border border-status-warning/25 bg-status-warning/12 text-status-warning'
                                : 'border border-white/12 bg-white/7 text-text-primary'
                          }`}
                        >
                          {message.content}
                        </div>
                      </motion.div>
                    ))}
                    </AnimatePresence>

                    {!sessionId && !isBootstrapping && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.04 }}
                        className="flex justify-start"
                      >
                        <div className="max-w-[85%] rounded-2xl border border-cyan-300/18 bg-cyan-300/9 px-4 py-3 text-sm leading-relaxed text-text-primary">
                          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.26em] text-cyan-200">
                            <Bot size={14} /> {t('badge')}
                          </div>
                          <p>{t('messages.targetHelp')}</p>
                          <p className="mt-2 text-xs text-text-muted">{t('messages.targetExample')}</p>
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {(showThinking || isBootstrapping) && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="flex justify-start"
                        >
                          <div className="inline-flex items-center gap-1 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-100 [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-100 [animation-delay:140ms]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-100 [animation-delay:280ms]" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {currentQuestion && (
                      <div className="rounded-2xl border border-cyan-300/16 bg-cyan-300/7 p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">
                          <Bot size={14} /> {t('questionTitle')}
                        </div>
                        <p className="text-sm font-medium text-text-primary">{currentQuestion.text ?? t('messages.defaultQuestion')}</p>
                        {currentQuestion.hint && <p className="mt-1 text-xs text-text-muted">{currentQuestion.hint}</p>}
                        {hasQuestionChoices && (
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {currentQuestionChoices.map((choice, index) => {
                              // `value` is the backend's internal key; the label is both what
                              // we show and what we send back as the answer.
                              const choiceLabel = choice.label?.trim() || choice.value?.trim() || `Option ${index + 1}`;

                              return (
                                <button
                                  key={`${currentQuestion.question_id}-${choice.value ?? index}`}
                                  type="button"
                                  onClick={() => void submitAnswer(choiceLabel)}
                                  disabled={isBusy}
                                  className="rounded-2xl border border-cyan-300/18 bg-slate-950/35 px-3 py-2 text-left text-sm font-medium text-text-primary transition-colors hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {choiceLabel}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {hasRecommendation && recommendation && (
                      <div className="rounded-2xl border border-emerald-300/24 bg-emerald-300/10 p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">
                          <CheckCircle2 size={14} /> {t('recommendationTitle')}
                        </div>
                        {recommendation.plain_summary && <p className="text-sm leading-relaxed text-text-primary">{recommendation.plain_summary}</p>}

                        <div className="mt-4 grid gap-3 text-sm text-text-secondary">
                          {targetUrl && (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.24em] text-text-muted">{t('targetLabel')}</div>
                              <div className="mt-1 flex items-center gap-2 break-all">
                                <Target size={14} className="shrink-0 text-emerald-200" />
                                {targetUrl}
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="text-xs font-bold uppercase tracking-[0.24em] text-text-muted">{t('estimatedMinutes')}</div>
                            <div>{recommendation.estimated_minutes} min</div>
                          </div>

                          {recommendation.what_we_check?.length ? (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.24em] text-text-muted">{t('whatWeCheck')}</div>
                              <ul className="mt-2 list-disc space-y-1 pl-5 rtl:pl-0 rtl:pr-5">
                                {recommendation.what_we_check.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>

                        {targetRequired && (
                          <div className="mt-4 rounded-2xl border border-status-warning/28 bg-status-warning/12 p-3 text-sm text-status-warning">
                            {recommendation.notice || t('messages.targetRequired')}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            type="button"
                            onClick={() => void createScan()}
                            disabled={isBusy || targetRequired}
                            size="sm"
                            className="rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300 text-slate-950 hover:shadow-[0_0_24px_rgba(96,234,160,0.26)]"
                          >
                            {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {t('createScan')}
                          </Button>

                          <Link href={`/${locale}/scans/new`} className="rounded-full border border-white/12 bg-white/6 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-white/10">
                            {t('openFullForm')}
                          </Link>

                          <button
                            type="button"
                            onClick={startNewChat}
                            className="rounded-full border border-white/12 bg-transparent px-4 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary"
                          >
                            {t('restart')}
                          </button>
                        </div>
                      </div>
                    )}

                    {upgradeMessage && (
                      <div className="rounded-2xl border border-status-warning/28 bg-status-warning/12 p-4">
                        <div className="text-xs font-bold uppercase tracking-[0.22em] text-status-warning">
                          {t('upgrade.badge')}
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-text-primary">{t('upgrade.title')}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                          {upgradeMessage || t('upgrade.fallbackMessage')}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/${locale}/plans`}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:shadow-[0_0_22px_rgba(0,209,255,0.24)]"
                          >
                            {t('upgrade.cta')} <ArrowRight size={14} className="rtl:rotate-180" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setUpgradeMessage(null)}
                            className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-white/8 hover:text-text-primary"
                          >
                            {t('upgrade.dismiss')}
                          </button>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </motion.div>
              </div>

              <div className="border-t border-white/10 bg-[rgba(8,16,28,0.98)] px-4 py-3 sm:px-6">
                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    {composerMode !== 'idle' ? (
                      <Input
                        value={composerDraft}
                        onChange={(event) => setComposerDraft(event.target.value)}
                        placeholder={composerPlaceholder}
                        disabled={isBusy || isBootstrapping}
                        className="h-11 rounded-2xl border-cyan-300/20 bg-white/6 px-4 text-sm"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleComposerSubmit();
                          }
                        }}
                      />
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-muted">
                        {t('messages.thinking')}
                      </div>
                    )}
                  </div>

                  {composerMode !== 'idle' && (
                    <Button
                      type="button"
                      onClick={handleComposerSubmit}
                      disabled={isBusy || isBootstrapping}
                      size="sm"
                      className="h-11 shrink-0 rounded-2xl px-4"
                    >
                      {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      <span className="hidden sm:inline">{t('send')}</span>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
