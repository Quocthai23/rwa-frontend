'use client';
import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useToast } from '@/hook/useToast';
import SecretQrSection from './components/SecretQrSection';
import SetupNotice from './components/SetupNotice';
import StepItem from './components/StepItem';

export default function LinkAuthenticatorPageComponent() {
  const router = useRouter();
  const { showInfo, showError } = useToast();
  const { t } = useTranslation();

  const [otpAuthUrl, setOtpAuthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const toTimestampMs = (value: number | string | null | undefined): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;

    const parsedDate = Date.parse(value);
    if (Number.isFinite(parsedDate)) return parsedDate;

    const parsedNumber = Number(value);
    return Number.isFinite(parsedNumber) ? parsedNumber : null;
  };

  useEffect(() => {
    try {
      const flowRaw = localStorage.getItem('mfa-flow');
      if (flowRaw) {
        const parsedFlow = JSON.parse(flowRaw) as {
          expiresAt?: number | string;
          resendAvailableAt?: number | string;
        };
        const flowExpiryMs = toTimestampMs(parsedFlow?.expiresAt ?? parsedFlow?.resendAvailableAt);
        if (flowExpiryMs && Date.now() > flowExpiryMs) {
          localStorage.removeItem('mfa-flow');
          localStorage.removeItem('mfa-setup-totp');
          router.replace('/settings/security/authenticator-app');
          return;
        }
      }

      const raw = localStorage.getItem('mfa-setup-totp');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { otpAuthUrl?: string; secret?: string };
      if (parsed?.otpAuthUrl) setOtpAuthUrl(parsed.otpAuthUrl);
      if (parsed?.secret) setSecret(parsed.secret);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!otpAuthUrl) return;

    let cancelled = false;
    (async () => {
      const qrcode = await import('qrcode');
      const dataUrl = await qrcode.toDataURL(otpAuthUrl, { margin: 1, width: 220 });
      if (!cancelled) setQrDataUrl(dataUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [otpAuthUrl]);

  const handleCopySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    showInfo(
      t('security.linkAuthenticator.toasts.copiedTitle', {
        defaultValue: 'Copied',
      }),
      t('security.linkAuthenticator.toasts.copiedMessage', {
        defaultValue: 'Secret key copied to clipboard.',
      }),
    );
  };

  const handleContinue = () => {
    try {
      const flowRaw = localStorage.getItem('mfa-flow');
      if (flowRaw) {
        const parsedFlow = JSON.parse(flowRaw) as {
          expiresAt?: number | string;
          resendAvailableAt?: number | string;
        };
        const flowExpiryMs = toTimestampMs(parsedFlow?.expiresAt ?? parsedFlow?.resendAvailableAt);
        if (flowExpiryMs && Date.now() > flowExpiryMs) {
          showError(
            t('security.linkAuthenticator.errors.flowExpiredTitle', {
              defaultValue: 'Session expired',
            }),
            t('security.linkAuthenticator.errors.flowExpiredMessage', {
              defaultValue:
                'This setup step has timed out. Please start again from Authenticator app.',
            }),
          );
          localStorage.removeItem('mfa-flow');
          localStorage.removeItem('mfa-setup-totp');
          router.replace('/settings/security/authenticator-app');
          return;
        }
      }
    } catch {
      // ignore
    }
    router.push('/settings/security/authenticator-app/verify-authenticator?mode=setup');
  };

  return (
    <div className="bg-background flex h-full min-h-screen flex-col">
      <div className="sticky top-0 z-10 h-14 items-center justify-center">
        <Header
          label={t('security.linkAuthenticator.header.title', {
            defaultValue: 'Link Authenticator',
          })}
          onBack={() => {
            router.push('/settings/security');
          }}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 p-4">
        <StepItem
          step="01"
          text={t('security.linkAuthenticator.steps.step1', {
            defaultValue: 'Copy the 32-digit code. Alternatively, you can scan the QR code.',
          })}
        />

        <SecretQrSection
          secret={secret}
          qrDataUrl={qrDataUrl}
          onCopySecret={handleCopySecret}
          keyLabel={t('security.linkAuthenticator.labels.key32', {
            defaultValue: '32-character Key:',
          })}
          copyLabel={t('security.linkAuthenticator.actions.copy', {
            defaultValue: 'Copy',
          })}
          qrAlt={t('security.linkAuthenticator.labels.qrAlt', {
            defaultValue: 'Authenticator QR',
          })}
        />

        <StepItem
          step="02"
          text={t('security.linkAuthenticator.steps.step2', {
            defaultValue: 'Open Authenticator and add the 32-digit key you copied.',
          })}
        />

        <StepItem
          step="03"
          text={t('security.linkAuthenticator.steps.step3', {
            defaultValue: 'Return and verify the new authenticator in MTX Trading App.',
          })}
        />

        <SetupNotice
          message={t('security.linkAuthenticator.notice.completedStep2', {
            defaultValue: 'Please ensure you have completed step 2 before clicking next.',
          })}
        />

        <div className="mt-auto">
          <Button variant="primary-contained" className="w-full py-3" onClick={handleContinue}>
            <p className="text-button-small-medium text-white">
              {t('security.linkAuthenticator.actions.continue', {
                defaultValue: 'Continue',
              })}
            </p>
          </Button>
        </div>
      </div>
    </div>
  );
}
