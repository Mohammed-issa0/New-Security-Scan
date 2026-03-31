'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, Button, Input, Label } from '@/components/scans/ui';
import { Coins } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { adminService } from '@/lib/admin/adminService';
import { toast } from 'sonner';
import { ApiRequestError } from '@/lib/api/client';

export default function AdminBillingPage() {
  const t = useTranslations('admin.billing');
  const [userId, setUserId] = useState('');
  const [planName, setPlanName] = useState('');

  const normalizedUserId = userId.trim();
  const normalizedPlanName = planName.trim();
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedUserId);
  const canSubmit = !!normalizedUserId && !!normalizedPlanName && isValidUuid;

  const grantMutation = useMutation({
    mutationFn: () => adminService.billing.grantPlan({ userId: normalizedUserId, planName: normalizedPlanName }),
    onSuccess: () => {
      toast.success(t('grant.success'));
      setUserId('');
      setPlanName('');
    },
    onError: (error: any) => {
      if (error instanceof ApiRequestError) {
        toast.error(error.data?.error || t('grant.error'));
        return;
      }
      toast.error(error?.message || t('grant.error'));
    },
  });

  const onSubmit = () => {
    if (!normalizedUserId || !normalizedPlanName) {
      toast.error(t('grant.required'));
      return;
    }
    if (!isValidUuid) {
      toast.error(t('grant.userIdInvalid'));
      return;
    }
    grantMutation.mutate();
  };

  return (
    <Card>
      <CardHeader title={t('title')} description={t('subtitle')} icon={Coins} />
      <CardContent>
        <div className="max-w-lg space-y-4">
          <div className="space-y-1.5">
            <Label>{t('grant.userId')}</Label>
            <Input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder={t('grant.userIdPlaceholder')}
            />
            {!!normalizedUserId && !isValidUuid && (
              <p className="text-xs text-red-600">{t('grant.userIdInvalid')}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{t('grant.planName')}</Label>
            <Input
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
              placeholder={t('grant.planNamePlaceholder')}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onSubmit}
            disabled={!canSubmit || grantMutation.isPending}
          >
            {grantMutation.isPending ? t('grant.submitting') : t('grant.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
