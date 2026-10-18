'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import Header from '@/components/shared/Header';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';

import { authApi } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { useGetData } from '@/context/GetdataContext';
import type { VerifyAuthChallengeResponse } from '@/types/auth';

const RESEND_COOLDOWN_SECONDS = 60;

const toTimestampMs = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const parsedDate = Date.parse(value);
  if (Number.isFinite(parsedDate)) return parsedDate;

  const parsedNumber = Number(value);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
};

export default function VerifyAuthenticatorPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const login = useAuthStore((state) => state.login);
  const { refetchAssets } = useGetData();

  const mode = searchParams.get('mode') ?? 'setup';
  const redirect = searchParams.get('redirect') ?? '/';

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('mfa-flow');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        purpose?: string;
        expiresAt?: number | string;
        resendAvailableAt?: number | string;
      };
      if (parsed?.purpose !== 'DISABLE_MFA') return null;

      const storedResendAt = toTimestampMs(parsed.expiresAt ?? parsed.resendAvailableAt);
      if (storedResendAt != null && storedResendAt > Date.now()) {
        return storedResendAt;
      }
      if (storedResendAt != null) {
        return Date.now();
      }
      const fallback = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      const { resendAvailableAt: _dropResend, ...rest } = parsed;
      localStorage.setItem(
        'mfa-flow',
        JSON.stringify({
          ...rest,
          expiresAt: fallback,
        }),
      );
      return fallback;
    } catch {
      return null;
    }
  });

  const otpValue = useMemo(() => digits.join(''), [digits]);
  const otpReady = digits.every((d) => d.length === 1);

  const [mfaFlowContext, setMfaFlowContext] = useState<{
    challengeId: string;
    purpose: 'LOGIN' | 'SETUP_MFA' | 'DISABLE_MFA';
    requiredFactors?: Array<'TOTP' | 'EMAIL_OTP'>;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('mfa-flow');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        challengeId?: string;
        purpose?: string;
        requiredFactors?: unknown;
      };
      if (
        !parsed?.challengeId ||
        (parsed.purpose !== 'LOGIN' &&
          parsed.purpose !== 'SETUP_MFA' &&
          parsed.purpose !== 'DISABLE_MFA')
      ) {
        return null;
      }

      const requiredFactors = Array.isArray(parsed.requiredFactors)
        ? (parsed.requiredFactors.filter((f) => f === 'TOTP' || f === 'EMAIL_OTP') as Array<
            'TOTP' | 'EMAIL_OTP'
          >)
        : undefined;
      return {
        challengeId: parsed.challengeId,
        purpose: parsed.purpose as 'LOGIN' | 'SETUP_MFA' | 'DISABLE_MFA',
        ...(requiredFactors && requiredFactors.length > 0 ? { requiredFactors } : {}),
      };
    } catch {
      return null;
    }
  });

  const verifyFactor = useMemo<'TOTP' | 'EMAIL_OTP'>(() => {
    const factors = mfaFlowContext?.requiredFactors;
    if (factors?.includes('TOTP')) return 'TOTP';
    if (factors?.includes('EMAIL_OTP')) return 'EMAIL_OTP';
    // Fallback to the legacy behavior.
    return 'TOTP';
  }, [mfaFlowContext?.requiredFactors]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const resendCountdownSeconds = useMemo(() => {
    if (!resendAvailableAt) return 0;
    return Math.max(0, Math.ceil((resendAvailableAt - nowMs) / 1000));
  }, [nowMs, resendAvailableAt]);

  const formatMMSS = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleChange = (index: number, rawValue: string) => {
    const clean = rawValue.replace(/[^0-9]/g, '');
    if (!clean) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean[clean.length - 1];
      return next;
    });

    if (inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 6);
    if (!pasted) return;

    const next = [...Array(6)].map((_, idx) => pasted[idx] || '');
    setDigits(next);

    const lastIndex = Math.min(pasted.length, 6) - 1;
    if (lastIndex >= 0) {
      inputsRef.current[lastIndex]?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
        return;
      }
      if (inputsRef.current[index - 1]) {
        const prevIndex = index - 1;
        setDigits((prev) => {
          const next = [...prev];
          next[prevIndex] = '';
          return next;
        });
        inputsRef.current[prevIndex]?.focus();
      }
    }
  };

  const handleContinue = async () => {
    if (!otpReady || isProcessing) return;

    try {
      const flowRaw = localStorage.getItem('mfa-flow');
      if (flowRaw) {
        const parsedFlow = JSON.parse(flowRaw) as {
          expiresAt?: number | string;
          resendAvailableAt?: number | string;
          purpose?: string;
        };
        const flowExpiryMs = toTimestampMs(parsedFlow?.expiresAt ?? parsedFlow?.resendAvailableAt);
        if (flowExpiryMs && Date.now() > flowExpiryMs) {
          showError(
            t('security.verifyAuthenticator.errors.flowExpiredTitle', {
              defaultValue: 'Session expired',
            }),
            t('security.verifyAuthenticator.errors.flowExpiredMessage', {
              defaultValue: 'This verification has timed out. Please start again.',
            }),
          );
          localStorage.removeItem('mfa-flow');
          localStorage.removeItem('mfa-setup-totp');
          if (mode === 'login') {
            router.replace('/login');
          } else {
            router.replace('/settings/security/authenticator-app');
          }
          return;
        }
      }
    } catch {
      // ignore
    }

    if (!mfaFlowContext) {
      showError(
        t('security.verifyAuthenticator.errors.mfaChallengeMissingTitle', {
          defaultValue: 'MFA challenge missing',
        }),
        t('security.verifyAuthenticator.errors.mfaChallengeMissingMessage', {
          defaultValue: 'Please restart the MFA flow and try again.',
        }),
      );
      return;
    }

    setIsProcessing(true);
    try {
      const res: VerifyAuthChallengeResponse = await authApi.verifyAuthChallenge({
        challengeId: mfaFlowContext.challengeId,
        factor: verifyFactor,
        code: otpValue,
      });

      if (res.completed === true && res.purpose === 'LOGIN') {
        tokenStorage.setAccessToken(res.accessToken);
        login(res.user);
        refetchAssets();

        localStorage.removeItem('mfa-flow');
        localStorage.removeItem('mfa-setup-totp');

        showSuccess(t('auth.login.loginSuccessfulTitle'), t('auth.login.loginSuccessfulMessage'));
        router.replace(redirect);
        return;
      }

      if (res.completed === true && res.purpose === 'SETUP_MFA') {
        localStorage.setItem(
          'authenticator-app-data',
          JSON.stringify({
            addedOn: new Date().toISOString(),
          }),
        );
        localStorage.setItem('authenticator-app-verified', 'true');
        localStorage.removeItem('mfa-flow');
        localStorage.removeItem('mfa-setup-totp');

        showSuccess(
          t('security.verifyAuthenticator.toasts.enabledTitle', {
            defaultValue: 'Authenticator app enabled',
          }),
          t('security.verifyAuthenticator.toasts.enabledMessage', {
            defaultValue: 'MFA is now enabled.',
          }),
        );
        router.push('/settings/security/authenticator-app');
        return;
      }

      if (res.completed === true && res.purpose === 'DISABLE_MFA') {
        localStorage.removeItem('authenticator-app-data');
        localStorage.removeItem('authenticator-app-verified');
        localStorage.removeItem('mfa-flow');
        localStorage.removeItem('mfa-setup-totp');

        showSuccess(
          t('security.verifyAuthenticator.toasts.removedTitle', {
            defaultValue: 'Authenticator app removed',
          }),
          t('security.verifyAuthenticator.toasts.removedMessage', {
            defaultValue: 'MFA has been disabled.',
          }),
        );
        router.push('/settings/security/authenticator-app');
        return;
      }

      showError(
        t('security.verifyAuthenticator.errors.notCompletedTitle', {
          defaultValue: 'MFA verification not completed',
        }),
        t('security.verifyAuthenticator.errors.tryAgainMessage', {
          defaultValue: 'Please try again.',
        }),
      );
    } catch (error: unknown) {
      showError(
        t('security.verifyAuthenticator.errors.invalidCodeTitle', {
          defaultValue: 'Invalid code',
        }),
        localizeApiError(error, t),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendForDisable = async () => {
    if (
      mode !== 'disable' ||
      verifyFactor !== 'EMAIL_OTP' ||
      isResending ||
      isProcessing ||
      resendCountdownSeconds > 0
    ) {
      return;
    }

    setIsResending(true);
    try {
      const res = await authApi.createAuthChallenge({ purpose: 'DISABLE_MFA' });
      const nextFlowContext = {
        challengeId: res.challengeId,
        purpose: 'DISABLE_MFA' as const,
        requiredFactors: res.requiredFactors.filter(
          (factor): factor is 'TOTP' | 'EMAIL_OTP' => factor === 'TOTP' || factor === 'EMAIL_OTP',
        ),
      };

      const nextResendAvailableAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      localStorage.setItem(
        'mfa-flow',
        JSON.stringify({
          ...nextFlowContext,
          expiresAt: nextResendAvailableAt,
        }),
      );
      setMfaFlowContext(nextFlowContext);
      setResendAvailableAt(nextResendAvailableAt);
      setDigits(Array(6).fill(''));
      inputsRef.current[0]?.focus();
      showSuccess(
        t('security.verifyAuthenticator.toasts.codeSentTitle', {
          defaultValue: 'Code sent',
        }),
        t('security.verifyAuthenticator.toasts.codeSentMessage', {
          defaultValue: 'A new verification code has been sent to your email.',
        }),
      );
    } catch (error: unknown) {
      showError(
        t('security.verifyAuthenticator.errors.resendFailedTitle', {
          defaultValue: 'Failed to resend code',
        }),
        localizeApiError(error, t),
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-background flex h-full min-h-screen flex-col">
      <div className="sticky top-0 z-10 h-14 items-center justify-center">
        <Header
          label={
            mode === 'disable'
              ? t('security.verifyAuthenticator.header.disableTitle', {
                  defaultValue: 'Disable Authenticator App',
                })
              : t('security.verifyAuthenticator.header.verifyTitle', {
                  defaultValue: 'Verify via Authenticator App',
                })
          }
          onBack={() => router.back()}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 p-4">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-body-small-medium text-neutral-000 mt-2">
              {verifyFactor === 'EMAIL_OTP'
                ? t('security.verifyAuthenticator.descriptions.emailOtp', {
                    defaultValue: 'Enter the 6-digit verification code sent to your email.',
                  })
                : t('security.verifyAuthenticator.descriptions.totp', {
                    defaultValue:
                      'Enter the 6-digit verification code generated by your Authenticator App.',
                  })}
            </p>
          </div>

          <div className="flex justify-between gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[i] || ''}
                onChange={(e) => handleChange(i, e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => handleKeyDown(e, i)}
                aria-label={t('security.verifyAuthenticator.otpAriaLabel', { index: i + 1 })}
                className="border-border h-10 w-10 rounded border text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-50 dark:border-neutral-700 dark:bg-neutral-800"
              />
            ))}
          </div>

          {mode === 'disable' && verifyFactor === 'EMAIL_OTP' && (
            <Button
              variant="white-contained"
              onClick={handleResendForDisable}
              disabled={isResending || isProcessing || resendCountdownSeconds > 0}
              className="disabled:opacity-50"
            >
              <p className="text-body-large-medium text-primary-500">
                {isResending
                  ? t('security.verifyAuthenticator.actions.sending', {
                      defaultValue: 'Sending...',
                    })
                  : resendCountdownSeconds > 0
                    ? t('security.verifyAuthenticator.actions.resendIn', {
                        time: formatMMSS(resendCountdownSeconds),
                        defaultValue: 'Resend code in {{time}}',
                      })
                    : t('security.verifyAuthenticator.actions.resend', {
                        defaultValue: 'Resend code',
                      })}
              </p>
            </Button>
          )}
        </div>

        <div className="mt-auto py-2">
          <Button
            variant="primary-contained"
            className="w-full py-3"
            disabled={!otpReady || isProcessing}
            onClick={handleContinue}
          >
            {isProcessing
              ? t('security.verifyAuthenticator.actions.processing', {
                  defaultValue: 'Processing...',
                })
              : t('security.verifyAuthenticator.actions.verify', {
                  defaultValue: 'Verify',
                })}
          </Button>
        </div>
      </div>
    </div>
  );
}

