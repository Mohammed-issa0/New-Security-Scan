'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bot, CheckCircle2, Info, Loader2, RefreshCcw, Send, Sparkles, Target, X } from 'lucide-react';

import {
  GuidedSetupQuestion,
  GuidedSetupSessionResponse,
  GuidedSetupStepResponse,
  ScanRecommendation,
  StartGuidedSetupResponse,
} from '@/lib/api/types';
import { ApiRequestError } from '@/lib/api/client';
import { tokenStore } from '@/lib/auth/tokenStore';
import { guidedSetupService } from '@/lib/scans/guidedSetupService';
import { Badge, Button, Input } from '@/components/scans/ui';

type ChatRole = 'assistant' | 'user' | 'system';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type StoredAssistantState = {
  sessionId?: string;
  targetUrl?: string;
  question?: GuidedSetupQuestion | null;
  recommendation?: ScanRecommendation | null;
  messages?: ChatMessage[];
};

const STORAGE_KEY = 'securityscan.ai-assistant.state';

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeQuestion(question?: GuidedSetupQuestion | null): GuidedSetupQuestion | null {
  if (!question) {
    return null;
  }

  return question;
}

function safeParseState(raw: string | null): StoredAssistantState | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAssistantState;
  } catch {
    return null;
  }
}

function getApiErrorMessage(error: ApiRequestError, fallback: string) {
  const payload = (error.data ?? {}) as Record<string, unknown>;
  const detail = payload.detail;
  const title = payload.title;
  const message = payload.message;
  const apiError = payload.error;

  return String(message || detail || title || apiError || error.message || fallback);
}

function isPlanGateError(error: ApiRequestError) {
  const text = `${error.message} ${error.data?.error ?? ''} ${error.data?.detail ?? ''}`.toLowerCase();
  const hasPlanSignal = /(plan|subscription|credit|quota|billing|upgrade|package|باقة|اشتراك|رصيد)/i.test(text);
  return error.status === 402 || error.status === 403 || (error.status === 400 && hasPlanSignal);
}

export function FloatingAssistant() {
  const t = useTranslations('landing.guidedSetup');
  const locale = useLocale();
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
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [currentQuestion, setCurrentQuestion] = React.useState<GuidedSetupQuestion | null>(null);
  const [draftAnswer, setDraftAnswer] = React.useState('');
  const [recommendation, setRecommendation] = React.useState<ScanRecommendation | null>(null);
  const [upgradeMessage, setUpgradeMessage] = React.useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = React.useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = React.useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = React.useState<string | null>(null);
  const [showSessionDetails, setShowSessionDetails] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setIsAuthenticated(!!tokenStore.getTokens()?.accessToken);
    return tokenStore.subscribe((tokens) => {
      setIsAuthenticated(!!tokens?.accessToken);
    });
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isAuthenticated) {
      return;
    }

    setIsOpen(false);
    setSessionId(null);
    setSessionExpiresAt(null);
    setSessionStatus(null);
    setSessionUrl(null);
    setShowSessionDetails(false);
    setTargetUrl('');
    setMessages(initialMessages);
    setCurrentQuestion(null);
    setDraftAnswer('');
    setRecommendation(null);
    setUpgradeMessage(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, [initialMessages, isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') {
      return;
    }

    const stored = safeParseState(window.localStorage.getItem(STORAGE_KEY));
    if (!stored) {
      setMessages(initialMessages);
      return;
    }

    setSessionId(stored.sessionId ?? null);
    setTargetUrl(stored.targetUrl ?? '');
    setMessages(stored.messages?.length ? stored.messages : initialMessages);
    setCurrentQuestion(normalizeQuestion(stored.question));
    setRecommendation(stored.recommendation ?? null);
  }, [initialMessages, isAuthenticated]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  React.useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') {
      return;
    }

    if (!sessionId && !targetUrl && !currentQuestion && !recommendation && messages.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const state: StoredAssistantState = {
      sessionId: sessionId ?? undefined,
      targetUrl: targetUrl || undefined,
      question: currentQuestion,
      recommendation,
      messages,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [currentQuestion, isAuthenticated, messages, recommendation, sessionId, targetUrl]);

  const persistSessionMeta = React.useCallback((response: StartGuidedSetupResponse | GuidedSetupSessionResponse) => {
    setSessionId(response.sessionId);
    if ('expiresAt' in response) {
      setSessionExpiresAt(response.expiresAt);
    }
    if ('status' in response) {
      setSessionStatus(response.status ?? null);
    }
    if ('targetUrl' in response) {
      setSessionUrl(response.targetUrl ?? null);
    }
  }, []);

  const appendMessage = React.useCallback((role: ChatRole, content: string) => {
    setMessages((previous) => [...previous, { id: makeId(role), role, content }]);
  }, []);

  const resetSession = React.useCallback(() => {
    setSessionId(null);
    setSessionExpiresAt(null);
    setSessionStatus(null);
    setSessionUrl(null);
    setTargetUrl('');
    setMessages(initialMessages);
    setCurrentQuestion(null);
    setDraftAnswer('');
    setRecommendation(null);
    setUpgradeMessage(null);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [initialMessages]);

  const startGuidedSetup = React.useCallback(async () => {
    const trimmedTarget = targetUrl.trim();
    if (!trimmedTarget) {
      appendMessage('system', t('messages.targetRequired'));
      return;
    }

    setIsBusy(true);
    setUpgradeMessage(null);
    try {
      const response = await guidedSetupService.startSession({ targetUrl: trimmedTarget });
      persistSessionMeta(response);
      setSessionUrl(trimmedTarget);
      setShowSessionDetails(false);
      setMessages([
        ...initialMessages,
        { id: makeId('user-target'), role: 'user', content: trimmedTarget },
      ]);
      setCurrentQuestion(normalizeQuestion(response.question));
      setRecommendation(null);
      setDraftAnswer('');
      setIsOpen(true);
    } catch (error) {
      const message = error instanceof ApiRequestError
        ? getApiErrorMessage(error, t('messages.startError'))
        : t('messages.startError');
      appendMessage('system', message);
    } finally {
      setIsBusy(false);
    }
  }, [appendMessage, initialMessages, persistSessionMeta, targetUrl, t]);

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
    setDraftAnswer('');
    setIsBusy(true);
    setUpgradeMessage(null);

    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 320);
      });

      const response = await guidedSetupService.submitAnswer(sessionId, {
        questionId: submittedQuestion.question_id,
        questionText: submittedQuestion.text ?? null,
        answer: trimmedAnswer,
      });

      if (response.question) {
        setCurrentQuestion(response.question);
        setRecommendation(null);
      } else if (response.stepType === 'recommendation' && response.recommendation) {
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
  }, [appendMessage, currentQuestion, sessionId, t]);

  const createScan = React.useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setIsBusy(true);
    setUpgradeMessage(null);
    try {
      const response = await guidedSetupService.createScanFromRecommendation(sessionId, {
        targetUrl: targetUrl.trim() || undefined,
      });

      resetSession();
      setIsOpen(false);

      if (response.scanId) {
        router.push(`/${locale}/scans/${response.scanId}`);
      } else {
        router.push(`/${locale}/scans`);
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const backendMessage = getApiErrorMessage(error, t('messages.createError'));
        const requiresUpgrade = isPlanGateError(error);
        appendMessage('system', backendMessage);

        if (requiresUpgrade) {
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
  }, [appendMessage, locale, router, resetSession, sessionId, targetUrl, t]);

  const restoreSession = React.useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setIsBootstrapping(true);
    try {
      const response = await guidedSetupService.getSession(sessionId);
      setSessionStatus(response.status ?? null);
      setSessionUrl(response.targetUrl ?? null);
      setRecommendation(response.recommendation ?? null);
      if (response.recommendation) {
        setCurrentQuestion(null);
      }
    } catch (error) {
      const message = error instanceof ApiRequestError
        ? getApiErrorMessage(error, t('messages.resumeError'))
        : t('messages.resumeError');
      appendMessage('system', message);
    } finally {
      setIsBootstrapping(false);
    }
  }, [appendMessage, sessionId, t]);

  React.useEffect(() => {
    if (sessionId && isOpen && !currentQuestion && !recommendation && !isBootstrapping) {
      void restoreSession();
    }
  }, [currentQuestion, isBootstrapping, isOpen, recommendation, restoreSession, sessionId]);

  const hasRecommendation = !!recommendation;
  const currentQuestionChoices = currentQuestion?.choices?.filter((choice) => Boolean(choice?.label || choice?.value)) ?? [];
  const hasQuestionChoices = currentQuestionChoices.length > 0;
  const showThinking = isBusy && (Boolean(currentQuestion) || hasRecommendation || Boolean(sessionId));
  const composerMode = !sessionId && !currentQuestion && !hasRecommendation ? 'target' : currentQuestion ? 'answer' : 'idle';
  const composerValue = composerMode === 'target' ? targetUrl : draftAnswer;
  const composerPlaceholder = composerMode === 'target' ? t('targetPlaceholder') : t('answerPlaceholder');
  const composerSendLabel = composerMode === 'target' ? t('send') : t('send');
  const handleComposerSubmit = React.useCallback(() => {
    if (composerMode === 'target') {
      void startGuidedSetup();
      return;
    }

    if (composerMode === 'answer') {
      void submitAnswer(draftAnswer);
    }
  }, [composerMode, draftAnswer, startGuidedSetup, submitAnswer]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl border border-cyan-300/32 bg-[linear-gradient(135deg,rgba(8,18,31,0.98),rgba(7,14,24,0.98))] px-4 py-3 text-sm text-text-primary shadow-[0_20px_54px_rgba(0,173,255,0.24)] backdrop-blur-xl transition-all hover:border-cyan-300/55 hover:shadow-[0_24px_66px_rgba(0,191,255,0.32)] rtl:right-auto rtl:left-6"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-400 text-slate-950 shadow-[0_0_24px_rgba(0,209,255,0.34)]">
          <Sparkles size={20} />
        </span>
        <span className="hidden sm:block text-left rtl:text-right">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">{t('badge')}</span>
          <span className="block text-sm font-bold text-text-primary">{t('openButton')}</span>
        </span>
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
                <motion.span
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-5 end-24 hidden h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)] sm:block"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSessionDetails((previous) => !previous)}
                    className="rounded-xl border border-white/12 p-2 text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary"
                    aria-label={showSessionDetails ? 'Hide session details' : 'Show session details'}
                    title={showSessionDetails ? 'Hide session details' : 'Show session details'}
                  >
                    <Info size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={restoreSession}
                    disabled={!sessionId || isBootstrapping}
                    className="rounded-xl border border-white/12 p-2 text-text-muted transition-colors hover:bg-white/8 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    title={sessionId ? t('restore') : t('restore')}
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
                      {(sessionId || sessionStatus || sessionUrl || sessionExpiresAt) ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {sessionId && <div><span className="font-semibold text-text-secondary">Session:</span> {sessionId}</div>}
                          {sessionStatus && <div><span className="font-semibold text-text-secondary">Status:</span> {sessionStatus}</div>}
                          {sessionUrl && <div className="sm:col-span-2"><span className="font-semibold text-text-secondary">Target:</span> {sessionUrl}</div>}
                          {sessionExpiresAt && <div className="sm:col-span-2"><span className="font-semibold text-text-secondary">Expires:</span> {sessionExpiresAt}</div>}
                        </div>
                      ) : (
                        <div className="text-sm text-text-secondary">No session details yet.</div>
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

                    {!sessionId && !currentQuestion && !hasRecommendation && (
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
                      {showThinking && (
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
                              const choiceValue = choice.value?.trim() || choice.label?.trim() || '';
                              const choiceLabel = choice.label?.trim() || choiceValue || `Option ${index + 1}`;

                              return (
                                <button
                                  key={`${currentQuestion.question_id}-${choiceValue || index}`}
                                  type="button"
                                  onClick={() => void submitAnswer(choiceValue || choiceLabel)}
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
                          <div>
                            <div className="text-xs font-bold uppercase tracking-[0.24em] text-text-muted">{t('estimatedMinutes')}</div>
                            <div>{recommendation.estimated_minutes} min</div>
                          </div>

                          {recommendation.what_we_check?.length ? (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.24em] text-text-muted">{t('whatWeCheck')}</div>
                              <ul className="mt-2 list-disc space-y-1 pl-5">
                                {recommendation.what_we_check.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {recommendation.tools_with_depths?.length ? (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.24em] text-text-muted">{t('toolsWithDepths')}</div>
                              <ul className="mt-2 space-y-1">
                                {recommendation.tools_with_depths.map((item) => (
                                  <li key={`${item.tool_id ?? 'tool'}-${item.depth ?? 'depth'}`}>
                                    <span className="font-semibold text-text-primary">{item.tool_id ?? '-'}</span>
                                    <span className="text-text-muted"> · {item.depth ?? '-'}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            type="button"
                            onClick={() => void createScan()}
                            disabled={isBusy}
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
                            onClick={resetSession}
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
                        value={composerValue}
                        onChange={(event) => {
                          if (composerMode === 'target') {
                            setTargetUrl(event.target.value);
                          } else {
                            setDraftAnswer(event.target.value);
                          }
                        }}
                        placeholder={composerPlaceholder}
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
                      disabled={isBusy}
                      size="sm"
                      className="h-11 shrink-0 rounded-2xl px-4"
                    >
                      {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      <span className="hidden sm:inline">{composerSendLabel}</span>
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