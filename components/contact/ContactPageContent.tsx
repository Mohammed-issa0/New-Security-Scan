'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Container } from '@/components/landing/ui';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/FinalSections';
import { LandingAtmosphere } from '@/components/landing/Atmosphere';
import { Alert, Button, Input, Label, Textarea } from '@/components/scans/ui';
import { contactService } from '@/lib/contact/contactService';
import { ApiRequestError } from '@/lib/api/client';
import type { ContactRequest } from '@/lib/api/types';

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const SUBJECT_MAX = 150;
const MESSAGE_MAX = 5000;

export function ContactPageContent() {
  const t = useTranslations('contactPage');
  const [isSent, setIsSent] = React.useState(false);

  const contactSchema = z.object({
    name: z.string().trim().min(1, t('errors.nameRequired')).max(NAME_MAX, t('errors.nameTooLong')),
    email: z
      .string()
      .trim()
      .min(1, t('errors.emailRequired'))
      .max(EMAIL_MAX, t('errors.emailTooLong'))
      .email(t('errors.emailInvalid')),
    subject: z.string().trim().min(1, t('errors.subjectRequired')).max(SUBJECT_MAX, t('errors.subjectTooLong')),
    message: z.string().trim().min(1, t('errors.messageRequired')).max(MESSAGE_MAX, t('errors.messageTooLong')),
  });

  type ContactFormValues = z.infer<typeof contactSchema>;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', subject: '', message: '' },
  });

  const messageLength = watch('message')?.length ?? 0;

  const sendMutation = useMutation({
    mutationFn: (values: ContactRequest) => contactService.send(values),
    onSuccess: (response) => {
      setIsSent(true);
      reset();
      toast.success(response?.message || t('success.title'));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiRequestError) {
        // 400 can carry per-field problems; surface them on the fields themselves.
        const details = error.data?.details;
        if (details) {
          for (const [field, messages] of Object.entries(details)) {
            const key = field.charAt(0).toLowerCase() + field.slice(1);
            if (['name', 'email', 'subject', 'message'].includes(key) && messages?.[0]) {
              setError(key as keyof ContactFormValues, { message: messages[0] });
            }
          }
        }

        const fallback =
          error.status === 429
            ? t('errors.rateLimited')
            : error.status === 503
              ? t('errors.unavailable')
              : t('errors.sendFailed');

        toast.error(error.message || fallback);
        return;
      }

      toast.error(t('errors.sendFailed'));
    },
  });

  const onSubmit = (values: ContactFormValues) => {
    setIsSent(false);
    sendMutation.mutate(values);
  };

  return (
    <main className="black-brains-landing min-h-screen selection:bg-cyan-200 selection:text-cyan-950 overflow-x-hidden">
      <LandingAtmosphere />
      <Navbar />
      <div className="relative z-10 pt-28 pb-20">
        <Container>
          <div className="mx-auto max-w-2xl">
            <header className="mb-10 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
                <Mail size={14} /> {t('badge')}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
                {t('title')}
              </h1>
              <p className="text-text-secondary leading-relaxed">{t('subtitle')}</p>
            </header>

            {isSent && (
              <div className="mb-6">
                <Alert variant="success" title={t('success.title')}>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <p className="text-xs leading-relaxed">{t('success.description')}</p>
                  </div>
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="cyber-card space-y-6 rounded-2xl p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label required htmlFor="contact-name">{t('fields.name')}</Label>
                  <Input id="contact-name" maxLength={NAME_MAX} {...register('name')} placeholder={t('placeholders.name')} />
                  {errors.name && (
                    <p className="flex items-center gap-1 text-xs text-status-danger">
                      <AlertCircle size={12} /> {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label required htmlFor="contact-email">{t('fields.email')}</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    maxLength={EMAIL_MAX}
                    {...register('email')}
                    placeholder={t('placeholders.email')}
                  />
                  {errors.email && (
                    <p className="flex items-center gap-1 text-xs text-status-danger">
                      <AlertCircle size={12} /> {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label required htmlFor="contact-subject">{t('fields.subject')}</Label>
                <Input id="contact-subject" maxLength={SUBJECT_MAX} {...register('subject')} placeholder={t('placeholders.subject')} />
                {errors.subject && (
                  <p className="flex items-center gap-1 text-xs text-status-danger">
                    <AlertCircle size={12} /> {errors.subject.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label required htmlFor="contact-message">{t('fields.message')}</Label>
                <Textarea
                  id="contact-message"
                  rows={6}
                  maxLength={MESSAGE_MAX}
                  {...register('message')}
                  placeholder={t('placeholders.message')}
                />
                <div className="flex items-center justify-between gap-3">
                  {errors.message ? (
                    <p className="flex items-center gap-1 text-xs text-status-danger">
                      <AlertCircle size={12} /> {errors.message.message}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-text-muted">{messageLength} / {MESSAGE_MAX}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={sendMutation.isPending} className="gap-2">
                  {sendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {sendMutation.isPending ? t('sending') : t('submit')}
                </Button>
              </div>
            </form>
          </div>
        </Container>
      </div>
      <Footer />
    </main>
  );
}
