'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';
import { useAuthStore } from '@/store/authStore';
type Config = {
  configured: boolean;
  publicKey: string | null;
  subscriptions: { endpointHash: string }[];
};
const options = { baseUrl: CLIENT_BASE_URL };
async function hash(endpoint: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
export default function PushDeviceSettings({ onReady }: { onReady: (ready: boolean) => void }) {
  const { t } = useTranslation(),
    userId = useAuthStore((s) => s.user?.id),
    client = useQueryClient();
  const [supported, setSupported] = useState(false),
    [registered, setRegistered] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const key = ['notification-push', userId];
  const config = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => apiClient.get<Config>('/api/notifications/push', undefined, options),
  });
  useEffect(() => {
    setSupported(
      window.isSecureContext &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window,
    );
  }, []);
  useEffect(() => {
    let alive = true;
    if (!supported || !config.data) {
      onReady(false);
      return;
    }
    void navigator.serviceWorker
      .getRegistration('/')
      .then(async (registration) => {
        const subscription = await registration?.pushManager.getSubscription();
        const endpointHash = subscription ? await hash(subscription.endpoint) : null;
        const ready =
          Notification.permission === 'granted' &&
          Boolean(
            endpointHash &&
            config.data?.subscriptions.some((row) => row.endpointHash === endpointHash),
          );
        if (alive) {
          setRegistered(ready);
          onReady(ready);
        }
      })
      .catch(() => {
        if (alive) {
          setRegistered(false);
          onReady(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [supported, config.data, onReady]);
  const toggle = async () => {
    setError('');
    setBusy(true);
    try {
      if (!supported) throw Error('unsupported');
      if (registered) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await apiClient.delete(
            '/api/notifications/push/' + (await hash(subscription.endpoint)),
            undefined,
            options,
          );
          await subscription.unsubscribe();
        }
        setRegistered(false);
        onReady(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw Error('permission');
        if (!config.data?.publicKey) throw Error('configuration');
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        const raw = config.data.publicKey.replace(/-/g, '+').replace(/_/g, '/');
        const key = Uint8Array.from(atob(raw + '='.repeat((4 - (raw.length % 4)) % 4)), (c) =>
          c.charCodeAt(0),
        );
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key.buffer,
          }));
        await apiClient.post(
          '/api/notifications/push',
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.toJSON().keys?.p256dh ?? '',
              auth: subscription.toJSON().keys?.auth ?? '',
            },
          },
          options,
        );
        setRegistered(true);
        onReady(true);
      }
      await client.invalidateQueries({ queryKey: key });
    } catch {
      setError(
        t(
          'notificationSettings.pushError',
          'Could not update push notifications. Check browser permissions and try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border-border mt-5 rounded-lg border p-4">
      <h3 className="font-semibold">
        {t('notificationSettings.devicePush', 'Notifications on this device')}
      </h3>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        {t(
          'notificationSettings.pushHint',
          'Enable this device, then choose Push for the groups you want. Message details remain inside the app.',
        )}
      </p>
      {(!supported || (config.data && !config.data.configured)) && (
        <p className="text-muted-foreground mt-2 text-sm">
          {t(
            'notificationSettings.pushUnavailable',
            'Push requires a supported browser, HTTPS and server configuration. On iPhone, open the installed app from the Home Screen.',
          )}
        </p>
      )}
      <button
        type="button"
        disabled={!supported || !config.data?.configured || busy}
        onClick={() => void toggle()}
        className="bg-primary-500 mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy
          ? t('common.loading')
          : registered
            ? t('notificationSettings.disableDevice', 'Disable on this device')
            : t('notificationSettings.enableDevice', 'Enable on this device')}
      </button>
      {(error || config.isError) && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error || t('notificationSettings.saveError')}
        </p>
      )}
    </div>
  );
}
