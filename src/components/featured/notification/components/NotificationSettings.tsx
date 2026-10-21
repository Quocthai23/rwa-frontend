'use client';
import { useState } from 'react';
import PushDeviceSettings from '@/components/featured/notification/components/PushDeviceSettings';
import PriceAlertsSettings from '@/components/featured/notification/components/PriceAlertsSettings';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, X } from '@untitledui/icons';
import { Switch } from '@/components/shared/atoms/web/switch';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';
import { useAuthStore } from '@/store/authStore';
type Preferences = {
  language?: string;
  governanceEmail: boolean;
  email: string;
  emailConfigured: boolean;
  groups?: Record<
    string,
    { inApp: boolean; email: boolean; push?: boolean; followedPosts?: boolean }
  >;
};
type NotificationSettingsProps = { inSheet?: boolean; onBack?: () => void; onClose?: () => void };
export default function NotificationSettings({
  inSheet = false,
  onBack,
  onClose,
}: NotificationSettingsProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [pushReady, setPushReady] = useState(false);
  const client = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const key = ['notification-preferences', userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () =>
      apiClient.get<Preferences>('/api/notifications/preferences', undefined, {
        baseUrl: CLIENT_BASE_URL,
      }),
  });
  const mutation = useMutation({
    mutationFn: (payload: {
      governanceEmail?: boolean;
      language?: string;
      groups?: Record<
        string,
        { inApp?: boolean; email?: boolean; push?: boolean; followedPosts?: boolean }
      >;
    }) =>
      apiClient.patch<Preferences>('/api/notifications/preferences', payload, {
        baseUrl: CLIENT_BASE_URL,
      }),
    onSuccess: (value) => client.setQueryData(key, value),
  });
  return (
    <main
      className={
        inSheet
          ? 'scrollbar-neutral-slim bg-background text-foreground h-full overflow-y-auto px-5 py-4'
          : 'bg-background text-foreground min-h-dvh px-4 py-6 pb-28 md:px-10 md:py-8 md:pb-10'
      }
    >
      <div className="mx-auto max-w-2xl md:max-w-5xl">
        <header className="mb-6 flex items-center gap-3">
          <button
            onClick={() => (onBack ? onBack() : router.back())}
            className="hover:bg-muted rounded-lg p-2"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-xl font-semibold">{t('notificationSettings.title')}</h1>
          {inSheet && (
            <button
              onClick={onClose}
              className="hover:bg-muted rounded-lg p-2"
              aria-label={t('common.close')}
            >
              <X className="size-5" />
            </button>
          )}
        </header>
        {query.isLoading ? (
          <p>{t('common.loading')}</p>
        ) : query.isError ? (
          <p role="alert">{t('verification.loadError')}</p>
        ) : (
          <section className="border-border rounded-xl border p-5 md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="font-semibold">{t('notificationSettings.governance')}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {t('notificationSettings.description')}
                </p>
                <p className="mt-3 text-sm break-all">
                  {t('notificationSettings.recipient')}: {query.data?.email}
                </p>
              </div>
              <Switch
                aria-label={t('notificationSettings.governance')}
                checked={query.data?.governanceEmail ?? false}
                disabled={mutation.isPending || !query.data}
                onCheckedChange={(value) =>
                  mutation.mutate({
                    governanceEmail: value,
                    language:
                      query.data?.language ??
                      (i18n.resolvedLanguage ?? i18n.language).split('-')[0],
                  })
                }
              />
            </div>
            <PushDeviceSettings onReady={setPushReady} />
            <div className="border-border mt-6 border-t pt-5">
              <p className="text-muted-foreground mb-4 text-sm">
                {t(
                  'notificationSettings.groupHint',
                  'Choose in-app, email and push notifications for each group. Changes apply to new events.',
                )}
              </p>
              <div
                style={{ gridTemplateColumns: 'minmax(0, 1fr) 48px 48px 48px' }}
                className="border-border grid gap-3 border-b pb-3 text-sm font-medium"
              >
                <span>{t('notificationSettings.group', 'Group')}</span>
                <span className="text-center">{t('notificationSettings.inApp', 'In app')}</span>
                <span className="text-center">Email</span>
                <span className="text-center">Push</span>
              </div>
              {['finance', 'trading', 'asset', 'user', 'security', 'system'].map((group) => (
                <div
                  key={group}
                  style={{ gridTemplateColumns: 'minmax(0, 1fr) 48px 48px 48px' }}
                  className="border-border grid items-center gap-3 border-b py-4 text-sm"
                >
                  <div>
                    <span>{t('notifications.groups.' + group)}</span>
                    {group === 'user' && (
                      <label className="text-muted-foreground mt-2 flex items-center gap-2 text-xs leading-5">
                        <input
                          type="checkbox"
                          checked={query.data?.groups?.user?.followedPosts ?? false}
                          disabled={mutation.isPending}
                          onChange={(event) =>
                            mutation.mutate({
                              groups: { user: { followedPosts: event.target.checked } },
                            })
                          }
                        />
                        {t('notificationSettings.followedPosts', 'New posts from followed authors')}
                      </label>
                    )}
                  </div>
                  {(['inApp', 'email', 'push'] as const).map((channel) => (
                    <div key={channel} className="flex justify-center">
                      <Switch
                        aria-label={
                          t('notifications.groups.' + group) +
                          ' — ' +
                          t('notificationSettings.' + channel, channel)
                        }
                        checked={query.data?.groups?.[group]?.[channel] ?? channel === 'inApp'}
                        disabled={
                          mutation.isPending ||
                          !query.data ||
                          (channel === 'push' && !pushReady && !query.data?.groups?.[group]?.push)
                        }
                        onCheckedChange={(value) =>
                          mutation.mutate({ groups: { [group]: { [channel]: value } } })
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <label className="mt-5 block space-y-2 text-sm font-medium">
              {t('notificationSettings.language')}
              <select
                className="border-border bg-background h-11 w-full rounded-lg border px-3"
                disabled={mutation.isPending || !query.data}
                value={query.data?.language?.startsWith('vi') ? 'vi' : 'en'}
                onChange={(e) =>
                  mutation.mutate({
                    governanceEmail: query.data?.governanceEmail ?? false,
                    language: e.target.value,
                  })
                }
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </label>
            {query.data && !query.data.emailConfigured && (
              <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                {t('notificationSettings.missingSmtp')}
              </p>
            )}
            {mutation.isError && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                {t('notificationSettings.saveError')}
              </p>
            )}
            {mutation.isSuccess && (
              <p role="status" className="mt-3 text-sm text-green-600 dark:text-green-400">
                {t('notificationSettings.saved')}
              </p>
            )}
          </section>
        )}
        {userId && <PriceAlertsSettings />}
      </div>
    </main>
  );
}
