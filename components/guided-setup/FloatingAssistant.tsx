'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bot, CheckCircle2, Loader2, RefreshCcw, Send, Sparkles, Target, X } from 'lucide-react';

import {
  GuidedSetupQuestion,
  GuidedSetupSessionResponse,
  GuidedSetupStepResponse,
  ScanRecommendation,
  StartGuidedSetupResponse,
} from '@/lib/api/types';
import { guidedSetupService } from '@/lib/scans/guidedSetupService';

type IntentType = 'web' | 'api' | 'network' | 'unsure';

type ChatRole = 'assistant' | 'user' | 'system';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type StoredAssistantState = {
  sessionId?: string;
  targetUrl?: string;
  intent?: IntentType;
  question?: GuidedSetupQuestion | null;
  recommendation?: ScanRecommendation | null;
  messages?: ChatMessage[];
};

const STORAGE_KEY = 'securityscan.guided-setup.assistant';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'intro',
    role: 'assistant',
    content: 'Let us set up a scan in a few short steps.',
  },
];

const intentToLabel: Record<IntentType, string> = {
  web: 'Web App',
  api: 'API',
  network: 'Network',
  unsure: 'Not sure yet',
};

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

export function FloatingAssistant() {
  const t = useTranslations('landing.guidedSetup');
  const locale = useLocale();
  const router = useRouter();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isBootstrapping, setIsBootstrapping] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [targetUrl, setTargetUrl] = React.useState('');
  const [intent, setIntent] = React.useState<IntentType>('unsure');
  const [messages, setMessages] = React.useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [currentQuestion, setCurrentQuestion] = React.useState<GuidedSetupQuestion | null>(null);
  const [draftAnswer, setDraftAnswer] = React.useState('');
  const [recommendation, setRecommendation] = React.useState<ScanRecommendation | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = React.useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = React.useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const stored = safeParseState(window.localStorage.getItem(STORAGE_KEY));
    if (!stored) {
      return;
    }

    setSessionId(stored.sessionId ?? null);
    setTargetUrl(stored.targetUrl ?? '');
    setIntent(stored.intent ?? 'unsure');
    setMessages(stored.messages?.length ? stored.messages : INITIAL_MESSAGES);
    setCurrentQuestion(normalizeQuestion(stored.question));
    setRecommendation(stored.recommendation ?? null);
  }, []);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, currentQuestion, recommendation, isBusy]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!sessionId && !targetUrl && !currentQuestion && !recommendation && messages.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const state: StoredAssistantState = {
      sessionId: sessionId ?? undefined,
      targetUrl: targetUrl || undefined,
      intent,
      question: currentQuestion,
      recommendation,
      messages,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [currentQuestion, intent, messages, recommendation, sessionId, targetUrl]);

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
    setIntent('unsure');
    setMessages(INITIAL_MESSAGES);
    setCurrentQuestion(null);
    setDraftAnswer('');
    setRecommendation(null);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const normalizeResponse = React.useCallback((response: GuidedSetupStepResponse) => {
    persistSessionMeta({
      sessionId: response.sessionId,
      expiresAt: sessionExpiresAt ?? new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    } as StartGuidedSetupResponse);

    if (response.stepType === 'recommendation' && response.recommendation) {
      setCurrentQuestion(null);
      setRecommendation(response.recommendation);
      appendMessage('assistant', t('messages.recommendationReady'));
      return;
    }

    if (response.question) {
      setCurrentQuestion(response.question);
      setRecommendation(null);
      appendMessage('assistant', response.question.text ?? t('messages.defaultQuestion'));
    }
  }, [appendMessage, persistSessionMeta, sessionExpiresAt, t]);

  const startGuidedSetup = React.useCallback(async () => {
    const trimmedTarget = targetUrl.trim();
    if (!trimmedTarget) {
      appendMessage('system', t('messages.targetRequired'));
      return;
    }

    setIsBusy(true);
    try {
      const response = await guidedSetupService.startSession({ targetUrl: trimmedTarget });
      persistSessionMeta(response);
      setSessionUrl(trimmedTarget);
      setMessages([
        ...INITIAL_MESSAGES,
        { id: makeId('user-target'), role: 'user', content: trimmedTarget },
        { id: makeId('assistant-question'), role: 'assistant', content: response.question?.text ?? t('messages.defaultQuestion') },
      ]);
      setCurrentQuestion(normalizeQuestion(response.question));
      setRecommendation(null);
      setDraftAnswer('');
      setIsOpen(true);
    } catch {
      appendMessage('system', t('messages.startError'));
    } finally {
      setIsBusy(false);
    }
  }, [appendMessage, persistSessionMeta, targetUrl, t]);

  const submitAnswer = React.useCallback(async (answer: string) => {
    if (!sessionId || !currentQuestion) {
      return;
    }

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      appendMessage('system', t('messages.answerRequired'));
      return;
    }

    setIsBusy(true);
    appendMessage('user', trimmedAnswer);

    try {
      const response = await guidedSetupService.submitAnswer(sessionId, {
        questionId: currentQuestion.question_id,
        questionText: currentQuestion.text ?? null,
        answer: trimmedAnswer,
      });

      if (response.question) {
        setCurrentQuestion(response.question);
        setRecommendation(null);
        appendMessage('assistant', response.question.text ?? t('messages.defaultQuestion'));
      } else if (response.stepType === 'recommendation' && response.recommendation) {
        setCurrentQuestion(null);
        setRecommendation(response.recommendation);
        appendMessage('assistant', t('messages.recommendationReady'));
      }
    } catch {
      appendMessage('system', t('messages.answerError'));
    } finally {
      setDraftAnswer('');
      setIsBusy(false);
    }
  }, [appendMessage, currentQuestion, sessionId, t]);

  const createScan = React.useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setIsBusy(true);
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
    } catch {
      appendMessage('system', t('messages.createError'));
    } finally {
      setIsBusy(false);
    }
  }, [appendMessage, locale, router, resetSession, sessionId, targetUrl, t]);

  const chooseIntent = React.useCallback((nextIntent: IntentType) => {
    setIntent(nextIntent);
    appendMessage('user', intentToLabel[nextIntent]);
  }, [appendMessage]);

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
    } catch {
      appendMessage('system', t('messages.resumeError'));
    } finally {
      setIsBootstrapping(false);
    }
  }, [appendMessage, sessionId, t]);

  React.useEffect(() => {
    if (sessionId && isOpen && !currentQuestion && !recommendation && !isBootstrapping) {
      void restoreSession();
    }
  }, [currentQuestion, isBootstrapping, isOpen, recommendation, restoreSession, sessionId]);

  const questionChoices = currentQuestion?.choices?.filter((choice) => choice?.value || choice?.label) ?? [];
  const hasRecommendation = !!recommendation;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-full border border-cyan-300/25 bg-[rgba(4,14,24,0.92)] px-5 py-4 text-sm font-semibold text-text-primary shadow-[0_18px_50px_rgba(0,209,255,0.16)] backdrop-blur-xl transition-colors hover:border-cyan-300/45 hover:bg-[rgba(7,18,31,0.98)] rtl:right-auto rtl:left-6"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-400 text-slate-950 shadow-[0_0_24px_rgba(0,209,255,0.28)]">
          <Bot size={22} />
        </span>
        <span className="hidden sm:block text-left rtl:text-right">
          <span className="block text-xs uppercase tracking-[0.3em] text-cyan-200/80">{t('badge')}</span>
          <span className="block text-sm text-text-primary">{t('openButton')}</span>
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
              className="relative flex h-[min(82vh,44rem)] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2rem] border border-cyan-300/18 bg-[rgba(6,12,21,0.98)] shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:max-w-[31rem]"
            >
              <div className="flex items-start justify-between border-b border-white/8 px-5 py-4 sm:px-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-100">
                    <Sparkles size={12} /> {t('badge')}
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{t('title')}</h3>
                  <p className="text-sm text-text-secondary">{t('subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {sessionId && (
                    <button
                      type="button"
                      onClick={restoreSession}
                      className="rounded-full border border-white/10 p-2 text-text-muted transition-colors hover:bg-white/6 hover:text-text-primary"
                      title={t('restore')}
                    >
                      {isBootstrapping ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full border border-white/10 p-2 text-text-muted transition-colors hover:bg-white/6 hover:text-text-primary"
                    aria-label={t('close')}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-cyan-300/14 bg-cyan-300/7 p-4">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">{t('targetLabel')}</label>
                    <input
                      value={targetUrl}
                      onChange={(event) => setTargetUrl(event.target.value)}
                      placeholder={t('targetPlaceholder')}
                      className="h-11 w-full rounded-xl border border-cyan-300/16 bg-white/5 px-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/30"
                    />
                    <p className="mt-2 text-xs text-text-muted">{t('targetHint')}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(intentToLabel) as IntentType[]).map((option) => {
                      const active = intent === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => chooseIntent(option)}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? 'border-cyan-300/40 bg-cyan-300/14 text-cyan-100'
                              : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/8 hover:text-text-primary'
                          }`}
                        >
                          {intentToLabel[option]}
                        </button>
                      );
                    })}
                  </div>

                  {!sessionId && !currentQuestion && !hasRecommendation && (
                    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                        <Target size={16} className="text-cyan-300" /> {t('readyTitle')}
                      </div>
                      <p className="text-sm leading-relaxed text-text-secondary">{t('readyDesc')}</p>
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void startGuidedSetup()}
                          disabled={isBusy}
                          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:shadow-[0_0_24px_rgba(0,209,255,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          {t('startButton')}
                        </button>
                        <Link href={`/${locale}/scans/new`} className="text-sm font-semibold text-cyan-200 transition-colors hover:text-cyan-100">
                          {t('openFullForm')} <ArrowRight size={14} className="inline-block align-[-2px]" />
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            message.role === 'user'
                              ? 'bg-cyan-300 text-slate-950'
                              : message.role === 'system'
                                ? 'border border-status-warning/25 bg-status-warning/12 text-status-warning'
                                : 'border border-white/8 bg-white/6 text-text-primary'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}

                    {currentQuestion && (
                      <div className="rounded-2xl border border-cyan-300/16 bg-cyan-300/7 p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">
                          <Bot size={14} /> {t('questionTitle')}
                        </div>
                        <p className="text-sm font-medium text-text-primary">{currentQuestion.text ?? t('messages.defaultQuestion')}</p>
                        {currentQuestion.hint && <p className="mt-1 text-xs text-text-muted">{currentQuestion.hint}</p>}

                        {questionChoices.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {questionChoices.map((choice) => (
                              <button
                                key={choice.value ?? choice.label ?? makeId('choice')}
                                type="button"
                                disabled={isBusy}
                                onClick={() => void submitAnswer(choice.label || choice.value || '')}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-cyan-300/35 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {choice.label ?? choice.value}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            <input
                              value={draftAnswer}
                              onChange={(event) => setDraftAnswer(event.target.value)}
                              placeholder={t('answerPlaceholder')}
                              className="h-11 w-full rounded-xl border border-cyan-300/16 bg-white/5 px-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-300/30"
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void submitAnswer(draftAnswer);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void submitAnswer(draftAnswer)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:shadow-[0_0_24px_rgba(0,209,255,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              {t('send')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {hasRecommendation && recommendation && (
                      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/8 p-4">
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
                          <button
                            type="button"
                            onClick={() => void createScan()}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:shadow-[0_0_24px_rgba(96,234,160,0.26)] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {t('createScan')}
                          </button>

                          <Link href={`/${locale}/scans/new`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-white/8">
                            {t('openFullForm')}
                          </Link>

                          <button
                            type="button"
                            onClick={resetSession}
                            className="rounded-full border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-white/6 hover:text-text-primary"
                          >
                            {t('restart')}
                          </button>
                        </div>
                      </div>
                    )}

                    {(sessionId || sessionStatus || sessionUrl) && (
                      <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-xs text-text-muted">
                        <div className="grid gap-2 sm:grid-cols-2">
                          {sessionId && <div><span className="font-semibold text-text-secondary">Session:</span> {sessionId}</div>}
                          {sessionStatus && <div><span className="font-semibold text-text-secondary">Status:</span> {sessionStatus}</div>}
                          {sessionUrl && <div className="sm:col-span-2"><span className="font-semibold text-text-secondary">Target:</span> {sessionUrl}</div>}
                          {sessionExpiresAt && <div className="sm:col-span-2"><span className="font-semibold text-text-secondary">Expires:</span> {sessionExpiresAt}</div>}
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/8 bg-[rgba(8,16,28,0.98)] px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
                  <span>{t('footerHint')}</span>
                  <Link href={`/${locale}/scans/new`} className="inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-cyan-100">
                    {t('openFullForm')} <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}