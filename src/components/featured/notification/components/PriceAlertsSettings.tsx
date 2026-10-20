'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useGetData } from '@/context/GetdataContext';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';
import { formatVnd, getIntlLocale } from '@/i18n/formatting';
type Alert = {
  id: string;
  direction: 'ABOVE' | 'BELOW';
  targetPrice: string;
  isActive: boolean;
  triggeredPrice: string | null;
  asset: { symbol: string; name: string };
};
const options = { baseUrl: CLIENT_BASE_URL };
export default function PriceAlertsSettings() {
  const { t, i18n } = useTranslation(),
    { assets } = useGetData(),
    userId = useAuthStore((s) => s.user?.id),
    client = useQueryClient();
  const [assetId, setAssetId] = useState(''),
    [direction, setDirection] = useState<'ABOVE' | 'BELOW'>('ABOVE'),
    [targetPrice, setTargetPrice] = useState('');
  const key = ['notification-price-alerts', userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => apiClient.get<Alert[]>('/api/notifications/price-alerts', undefined, options),
  });
  const mutation = useMutation({
    mutationFn: async (action: { kind: 'create' | 'delete' | 'rearm'; id?: string }) => {
      if (action.kind === 'create')
        return apiClient.post(
          '/api/notifications/price-alerts',
          { assetId, direction, targetPrice: targetPrice.replace(',', '.') },
          options,
        );
      if (action.kind === 'rearm')
        return apiClient.post(
          '/api/notifications/price-alerts/' + action.id + '/rearm',
          {},
          options,
        );
      return apiClient.delete('/api/notifications/price-alerts/' + action.id, undefined, options);
    },
    onSuccess: () => {
      setTargetPrice('');
      void client.invalidateQueries({ queryKey: key });
    },
  });
  const field = 'border-border bg-background h-11 w-full rounded-lg border px-3 text-sm';
  return (
    <section className="border-border mt-5 rounded-xl border p-5">
      <h2 className="font-semibold">{t('notificationSettings.priceAlerts', 'Price alerts')}</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        {t(
          'notificationSettings.priceHint',
          'Choose a recorded price threshold. Each alert fires once and then stops; you can arm it again. Maximum 20 active alerts.',
        )}
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ kind: 'create' });
        }}
      >
        <label className="block space-y-1 text-sm">
          <span>{t('notificationSettings.asset', 'Asset')}</span>
          <select
            className={field}
            value={assetId}
            required
            onChange={(e) => setAssetId(e.target.value)}
          >
            <option value="">{t('notificationSettings.chooseAsset', 'Choose an asset')}</option>
            {(assets ?? []).map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.symbol} — {asset.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t('notificationSettings.condition', 'Condition')}</span>
          <select
            className={field}
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'ABOVE' | 'BELOW')}
          >
            <option value="ABOVE">{t('notificationSettings.above', 'At or above')}</option>
            <option value="BELOW">{t('notificationSettings.below', 'At or below')}</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t('notificationSettings.threshold', 'Threshold (VND)')}</span>
          <input
            className={field}
            inputMode="decimal"
            value={targetPrice}
            required
            maxLength={27}
            pattern="[0-9]+([.,][0-9]{1,8})?"
            onChange={(e) => setTargetPrice(e.target.value)}
          />
        </label>
        <button
          className="bg-primary-500 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={mutation.isPending || !assetId}
        >
          {t('notificationSettings.addAlert', 'Create alert')}
        </button>
      </form>
      {(query.isError || mutation.isError) && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {t(
            'notificationSettings.alertError',
            'Could not update alerts. Check the threshold and active alert limit, then try again.',
          )}
        </p>
      )}
      <div className="mt-4 space-y-3">
        {query.data?.map((alert) => (
          <div key={alert.id} className="border-border rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{alert.asset.symbol}</strong>
              <span>
                {t(
                  alert.isActive ? 'notificationSettings.armed' : 'notificationSettings.triggered',
                  alert.isActive ? 'Armed' : 'Triggered',
                )}
              </span>
            </div>
            <p className="mt-2">
              {t(
                alert.direction === 'ABOVE'
                  ? 'notificationSettings.above'
                  : 'notificationSettings.below',
              )}{' '}
              {formatVnd(alert.targetPrice, getIntlLocale(i18n.resolvedLanguage ?? i18n.language))}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!alert.isActive && (
                <button
                  disabled={mutation.isPending}
                  className="border-border rounded-lg border px-3 py-2"
                  onClick={() => mutation.mutate({ kind: 'rearm', id: alert.id })}
                >
                  {t('notificationSettings.rearm', 'Arm again')}
                </button>
              )}
              <button
                disabled={mutation.isPending}
                className="border-border rounded-lg border px-3 py-2"
                onClick={() => mutation.mutate({ kind: 'delete', id: alert.id })}
              >
                {t('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
