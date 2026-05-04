'use client';
import { Button } from '@/components/shared/atoms/button';
import { Checkbox } from '@/components/shared/atoms/checkbox';
import { ChevronLeft, InfoHexagon, Trash01 } from '@untitledui/icons';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';

import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { localizeApiError } from '@/i18n/apiErrors';
import { useTranslation } from 'react-i18next';
import Header from '@/components/shared/Header';
import SplashLogo from '@/components/shared/SplashLogo';
import { useAuthStore } from '@/store/authStore';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shared/atoms/sheet';
import Image from 'next/image';
import { useTheme } from '@/theme';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function AuthenticatorAppComponent() {
  const router = useRouter();
  const { showError, showInfo } = useToast();
  const { t, i18n } = useTranslation();
  const { mode } = useTheme();
  const [verificationAnimationData, setVerificationAnimationData] = useState<unknown | null>(null);

  const [isCheckingLocalStorage, setIsCheckingLocalStorage] = useState(true);

  const [authenticatorAppData, setAuthenticatorAppData] = useState<string | null>(null);
  const [setupChallengeId, setSetupChallengeId] = useState<string | null>(null);
  const [isActivationStarted, setIsActivationStarted] = useState<boolean>(false);
  const RESEND_COOLDOWN_SECONDS = 1 * 60;
  /** Above this, remaining seconds is almost certainly a bug (e.g. nowMs was 0) — show ellipsis instead of raw value. */
  const RESEND_COUNTDOWN_MAX_PLAUSIBLE_SECONDS = RESEND_COOLDOWN_SECONDS * 5;

  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [setupDigits, setSetupDigits] = useState<string[]>(Array(6).fill(''));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const otpValue = useMemo(() => setupDigits.join(''), [setupDigits]);
  const otpReady = setupDigits.every((d) => d.length === 1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [isDisableNoticeAccepted, setIsDisableNoticeAccepted] = useState(false);
  const [isSecurityRiskAccepted, setIsSecurityRiskAccepted] = useState(false);
  const isAuthHydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const requireLogin = async <T,>(fn: () => Promise<T> | T): Promise<T | void> => {
    if (!isAuthHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/settings/security/authenticator-app')}`);
      return;
    }

    return fn();
  };

  const toTimestampMs = (value: number | string | null | undefined): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;

    const parsedDate = Date.parse(value);
    if (Number.isFinite(parsedDate)) return parsedDate;

    const parsedNumber = Number(value);
    return Number.isFinite(parsedNumber) ? parsedNumber : null;
  };

  useEffect(() => {
    const defaultAnimationPath = '/assets/animations/verification.json';
    const darkAnimationPath = '/assets/animations/verification-darkmode.json';
    const preferredAnimationPath = mode === 'dark' ? darkAnimationPath : defaultAnimationPath;

    const loadAnimation = async () => {
      try {
        const response = await fetch(preferredAnimationPath);
        if (!response.ok) {
          throw new Error(`Failed to load animation: ${preferredAnimationPath}`);
        }
        const data = await response.json();
        setVerificationAnimationData(data);
      } catch (error) {
        // Fallback to default animation when dark-mode file is unavailable.
        if (preferredAnimationPath !== defaultAnimationPath) {
          try {
            const fallbackResponse = await fetch(defaultAnimationPath);
            if (!fallbackResponse.ok) {
              throw new Error(`Failed to load fallback animation: ${defaultAnimationPath}`);
            }
            const fallbackData = await fallbackResponse.json();
            setVerificationAnimationData(fallbackData);
            return;
          } catch (fallbackError) {
            console.error(
              t('security.authenticatorApp.errors.loadAnimation', {
                defaultValue: 'Error loading Lottie animation:',
              }),
              fallbackError,
            );
            return;
          }
        }

        console.error(
          t('security.authenticatorApp.errors.loadAnimation', {
            defaultValue: 'Error loading Lottie animation:',
          }),
          error,
        );
      }
    };

    void loadAnimation();
  }, [mode, t]);

  useEffect(() => {
    let cancelled = false;
    const markDone = () => {
      if (!cancelled) {
        setIsCheckingLocalStorage(false);
      }
    };

    const hydrateFromLocalStorage = () => {
      const appDataRaw = localStorage.getItem('authenticator-app-data');
      if (appDataRaw) {
        setAuthenticatorAppData(appDataRaw);
        return;
      }

      const totpRaw = localStorage.getItem('mfa-setup-totp');
      if (totpRaw) {
        try {
          const parsedTotp = JSON.parse(totpRaw) as { otpAuthUrl?: unknown; secret?: unknown };
          const hasOtpAuthUrl =
            typeof parsedTotp?.otpAuthUrl === 'string' && parsedTotp.otpAuthUrl.length > 0;
          const hasSecret = typeof parsedTotp?.secret === 'string' && parsedTotp.secret.length > 0;
          if (hasOtpAuthUrl || hasSecret) {
            router.replace('/settings/security/authenticator-app/link-authenticator');
            return;
          }
        } catch {
          // ignore
        }
      }

      const raw = localStorage.getItem('mfa-flow');
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        challengeId?: string;
        purpose?: string;
        expiresAt?: number | string;
        resendAvailableAt?: number | string;
      };

      if (parsed?.purpose !== 'SETUP_MFA') {
        return;
      }

      const challengeId = parsed?.challengeId ?? null;
      if (!challengeId) {
        return;
      }

      setSetupChallengeId(challengeId);
      setIsActivationStarted(true);
      setNowMs(Date.now());

      const resendCooldownMs = toTimestampMs(
        parsed.resendAvailableAt ??
          (typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null),
      );
      if (resendCooldownMs != null && resendCooldownMs > Date.now()) {
        setResendAvailableAt(resendCooldownMs);
      } else if (resendCooldownMs != null) {
        setResendAvailableAt(Date.now());
      } else {
        setResendAvailableAt(null);
      }
    };

    (async () => {
      try {
        try {
          const me = await authApi.getMe();
          if (cancelled) return;

          if (Boolean(me?.enabledMfa)) {
            const serverData = JSON.stringify({
              addedOn: new Date().toISOString(),
            });
            localStorage.setItem('authenticator-app-data', serverData);
            localStorage.setItem('authenticator-app-verified', 'true');
            localStorage.removeItem('mfa-flow');
            localStorage.removeItem('mfa-setup-totp');

            setAuthenticatorAppData(serverData);
            setSetupChallengeId(null);
            setIsActivationStarted(false);
            setResendAvailableAt(null);
            setSetupDigits(Array(6).fill(''));
            markDone();
            return;
          }

          localStorage.removeItem('authenticator-app-data');
          localStorage.removeItem('authenticator-app-verified');
        } catch {
          // fallback to local storage bootstrap when getMe fails
        }

        hydrateFromLocalStorage();
      } catch {
        // fallback to splash dismissal below
      } finally {
        markDone();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const addedOn = useMemo(() => {
    const fallback = 'Nov 9, 2022';
    if (!authenticatorAppData) return fallback;

    try {
      const parsed = JSON.parse(authenticatorAppData) as any;
      const rawAddedOn = parsed?.addedOn ?? parsed?.createdOn ?? parsed?.createdAt;
      if (!rawAddedOn) return fallback;

      const parsedDate = new Date(rawAddedOn);
      if (Number.isNaN(parsedDate.getTime())) return fallback;

      return parsedDate.toLocaleDateString(i18n.language, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return fallback;
    }
  }, [authenticatorAppData, i18n.language]);

  const handleRemoveAuthenticator = async () => {
    if (isDisablingMfa) return;
    setIsDisablingMfa(true);
    try {
      await requireLogin(async () => {
        const res = await authApi.createAuthChallenge({ purpose: 'DISABLE_MFA' });
        if (res) {
          const resendCooldownUntilMs = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
          localStorage.setItem(
            'mfa-flow',
            JSON.stringify({
              challengeId: res.challengeId,
              purpose: 'DISABLE_MFA',
              requiredFactors: res.requiredFactors,
              expiresAt: resendCooldownUntilMs,
            }),
          );

          setIsRemoveConfirmOpen(false);
          router.push('/settings/security/authenticator-app/verify-authenticator?mode=disable');
        }
      });
    } catch (error: unknown) {
      showError(
        t('security.authenticatorApp.errors.disableMfaFailedTitle', {
          defaultValue: 'Failed to disable MFA',
        }),
        localizeApiError(error, t),
      );
    } finally {
      setIsDisablingMfa(false);
    }
  };

  useEffect(() => {
    if (authenticatorAppData) return;
    if (!isActivationStarted) return;
    if (setupChallengeId) return;

    let cancelled = false;
    setIsCreatingChallenge(true);

    (async () => {
      try {
        const res = await authApi.createAuthChallenge({ purpose: 'SETUP_MFA' });
        if (cancelled) return;

        const resendCooldownUntilMs = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
        localStorage.setItem(
          'mfa-flow',
          JSON.stringify({
            challengeId: res.challengeId,
            purpose: 'SETUP_MFA',
            requiredFactors: res.requiredFactors,
            expiresAt: res.expiresAt,
            resendAvailableAt: resendCooldownUntilMs,
          }),
        );
        setSetupChallengeId(res.challengeId);
        setNowMs(Date.now());
        setResendAvailableAt(resendCooldownUntilMs);
        showInfo(
          t('security.authenticatorApp.toasts.emailOtpSentTitle', {
            defaultValue: 'Email OTP sent',
          }),
          t('security.authenticatorApp.toasts.emailOtpSentMessage', {
            defaultValue: 'Enter the 6-digit code sent to your email.',
          }),
        );
      } catch (error: unknown) {
        if (cancelled) return;
        const maybeCode = (error as { code?: unknown } | undefined)?.code;
        const maybeMessage =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : (error as { message?: unknown } | undefined)?.message;

        const messageLower = typeof maybeMessage === 'string' ? maybeMessage.toLowerCase() : '';
        const isMfaAlreadyEnabled =
          maybeCode === 'mfa-already-enabled' || messageLower.includes('mfa is already enabled');
        router.back();
        if (isMfaAlreadyEnabled) {
          const now = new Date().toISOString();
          const data = JSON.stringify({ addedOn: now });
          localStorage.setItem('authenticator-app-data', data);
          localStorage.setItem('authenticator-app-verified', 'true');
          localStorage.removeItem('mfa-flow');
          localStorage.removeItem('mfa-setup-totp');
          setAuthenticatorAppData(data);
          setSetupChallengeId(null);
          setResendAvailableAt(null);
          setSetupDigits(Array(6).fill(''));
          showInfo(
            t('security.authenticatorApp.toasts.authenticatorEnabledTitle', {
              defaultValue: 'Authenticator enabled',
            }),
            t('security.authenticatorApp.toasts.authenticatorEnabledMessage', {
              defaultValue: 'MFA is already enabled for this account.',
            }),
          );
          return;
        }

        showError(
          t('security.authenticatorApp.errors.startSetupFailedTitle', {
            defaultValue: 'Failed to start MFA setup',
          }),
          localizeApiError(error, t),
        );
      } finally {
        if (!cancelled) setIsCreatingChallenge(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticatorAppData, setupChallengeId, isActivationStarted, showError, showInfo]);

  useEffect(() => {
    if (setupChallengeId) setIsActivationStarted(true);
  }, [setupChallengeId]);

  useEffect(() => {
    if (!setupChallengeId || resendAvailableAt !== null) return;
    const fallbackResendAvailableAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    setNowMs(Date.now());
    setResendAvailableAt(fallbackResendAvailableAt);
    try {
      const raw = localStorage.getItem('mfa-flow');
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        purpose?: string;
        resendAvailableAt?: number | string;
        expiresAt?: number | string;
      };
      if (parsed?.purpose !== 'SETUP_MFA') return;
      const { resendAvailableAt: _dropResend, ...rest } = parsed;
      localStorage.setItem(
        'mfa-flow',
        JSON.stringify({
          ...rest,
          resendAvailableAt: fallbackResendAvailableAt,
        }),
      );
    } catch {
      // ignore
    }
  }, [setupChallengeId, resendAvailableAt, RESEND_COOLDOWN_SECONDS]);

  useEffect(() => {
    if (!resendAvailableAt) return;
    const tick = () => setNowMs(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [resendAvailableAt]);

  const handleStartActivation = () => {
    void requireLogin(() => {
      setIsActivationStarted(true);
      return undefined;
    });
  };

  const handleResendOtp = async () => {
    if (isCreatingChallenge) return;
    if (resendCountdownSeconds > 0) return;

    setIsCreatingChallenge(true);
    try {
      const res = await authApi.createAuthChallenge({ purpose: 'SETUP_MFA' });

      const nextResendAvailableAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      localStorage.setItem(
        'mfa-flow',
        JSON.stringify({
          challengeId: res.challengeId,
          purpose: 'SETUP_MFA',
          requiredFactors: res.requiredFactors,
          expiresAt: res.expiresAt,
          resendAvailableAt: nextResendAvailableAt,
        }),
      );

      setSetupDigits(Array(6).fill(''));
      setSetupChallengeId(res.challengeId);
      setResendAvailableAt(nextResendAvailableAt);
      setNowMs(Date.now());
      setIsActivationStarted(true);

      showInfo(
        t('security.authenticatorApp.toasts.emailOtpSentTitle', {
          defaultValue: 'Email OTP sent',
        }),
        t('security.authenticatorApp.toasts.emailOtpSentMessage', {
          defaultValue: 'Enter the 6-digit code sent to your email.',
        }),
      );
    } catch (error: unknown) {
      showError(
        t('security.authenticatorApp.errors.resendOtpFailedTitle', {
          defaultValue: 'Failed to resend OTP',
        }),
        localizeApiError(error, t),
      );
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!setupChallengeId || !otpReady || isVerifying) return;
    setIsVerifying(true);

    try {
      const res = await authApi.verifyAuthChallenge({
        challengeId: setupChallengeId,
        factor: 'EMAIL_OTP',
        code: otpValue,
      });

      if (res.completed === false && res.purpose === 'SETUP_MFA') {
        localStorage.setItem(
          'mfa-setup-totp',
          JSON.stringify({
            otpAuthUrl: res.otpAuthUrl,
            secret: res.secret,
          }),
        );
        router.push('/settings/security/authenticator-app/link-authenticator');
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
        router.push('/settings/security/authenticator-app');
      }
    } catch (error: unknown) {
      showError(
        t('security.authenticatorApp.errors.invalidEmailOtpTitle', {
          defaultValue: 'Invalid email OTP',
        }),
        localizeApiError(error, t),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (index: number, rawValue: string) => {
    const clean = rawValue.replace(/[^0-9]/g, '');
    if (!clean) {
      setSetupDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    setSetupDigits((prev) => {
      const next = [...prev];
      next[index] = clean[clean.length - 1];
      return next;
    });

    if (inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 6);
    if (!pasted) return;

    const next = [...Array(6)].map((_, idx) => pasted[idx] || '');
    setSetupDigits(next);

    const lastIndex = Math.min(pasted.length, 6) - 1;
    if (lastIndex >= 0) {
      inputsRef.current[lastIndex]?.focus();
    }
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace') {
      if (setupDigits[index]) {
        setSetupDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
        return;
      }
      if (inputsRef.current[index - 1]) {
        const prevIndex = index - 1;
        setSetupDigits((prev) => {
          const next = [...prev];
          next[prevIndex] = '';
          return next;
        });
        inputsRef.current[prevIndex]?.focus();
      }
    }
  };

  const formatMMSS = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const resendCountdownSeconds = useMemo(() => {
    if (!resendAvailableAt) return RESEND_COOLDOWN_SECONDS;
    return Math.max(0, Math.ceil((resendAvailableAt - nowMs) / 1000));
  }, [nowMs, resendAvailableAt, RESEND_COOLDOWN_SECONDS]);

  const resendCountdownDisplay =
    resendCountdownSeconds > RESEND_COUNTDOWN_MAX_PLAUSIBLE_SECONDS
      ? '...'
      : formatMMSS(resendCountdownSeconds);

  if (isCheckingLocalStorage) return <SplashLogo size={300} />;

  const canConfirmRemove = isDisableNoticeAccepted && isSecurityRiskAccepted && !isDisablingMfa;
  const handleRemoveSheetOpenChange = (open: boolean) => {
    setIsRemoveConfirmOpen(open);
    if (!open) {
      setIsDisableNoticeAccepted(false);
      setIsSecurityRiskAccepted(false);
    }
  };

  return (
    <>
      <Sheet open={isRemoveConfirmOpen} onOpenChange={handleRemoveSheetOpenChange}>
        <SheetContent
          side="bottom"
          className="bg-background mx-auto flex w-full max-w-3xl flex-col rounded-t p-4"
          showCloseButton={false}
          title={t('security.authenticatorApp.removeSheet.title', {
            defaultValue: 'Are you sure you want to remove the Authenticator App?',
          })}
        >
          <SheetHeader className="items-center py-3">
            <Image
              src="/filled.svg"
              alt={t('security.authenticatorApp.removeSheet.alertAlt', {
                defaultValue: 'Alert',
              })}
              width={60}
              height={60}
            />
            <SheetTitle className="text-h3-semibold text-center">
              {t('security.authenticatorApp.removeSheet.title', {
                defaultValue: 'Are you sure you want to remove the Authenticator App?',
              })}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-2 mb-5 flex flex-col gap-4">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={isDisableNoticeAccepted}
                onCheckedChange={(checked) => setIsDisableNoticeAccepted(checked === true)}
                className="data-[state=checked]:border-primary-500 data-[state=checked]:bg-primary-500 mt-0.5 size-5 data-[state=checked]:text-white"
              />
              <span className="text-body-large-medium text-foreground">
                {t('security.authenticatorApp.removeSheet.noticeWithdrawal', {
                  defaultValue:
                    'To ensure account safety, withdrawals may be disabled for 24 hours after removing the authenticator app.',
                })}
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={isSecurityRiskAccepted}
                onCheckedChange={(checked) => setIsSecurityRiskAccepted(checked === true)}
                className="data-[state=checked]:border-primary-500 data-[state=checked]:bg-primary-500 mt-0.5 size-5 data-[state=checked]:text-white"
              />
              <span className="text-body-large-medium text-foreground">
                {t('security.authenticatorApp.removeSheet.noticeSecurityRisk', {
                  defaultValue:
                    'Two-factor authentication is required for withdrawals and other secure actions. Using only one verification method increases the risk to your account.',
                })}
              </span>
            </label>
          </div>

          <SheetFooter className="p-0">
            <div className="flex w-full flex-row gap-2">
              <Button
                variant="neutral-outline"
                className="flex-1 rounded py-3"
                onClick={() => setIsRemoveConfirmOpen(false)}
                disabled={isDisablingMfa}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                variant="primary-contained"
                className="flex-1 rounded py-3"
                onClick={handleRemoveAuthenticator}
                disabled={!canConfirmRemove}
              >
                {isDisablingMfa
                  ? t('security.authenticatorApp.actions.processing', {
                      defaultValue: 'Processing...',
                    })
                  : t('common.confirm', {
                      defaultValue: 'Confirm',
                    })}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {authenticatorAppData ? (
        <>
          <div className="bg-background flex h-full min-h-screen flex-col pb-28">
            <div className="sticky top-0 z-10 flex h-14 items-center justify-start">
              <Button
                variant="white-contained"
                className="h-10 w-10 p-0"
                onClick={() => router.push('/settings/security')}
              >
                <ChevronLeft className="size-6" />
              </Button>
            </div>
            <div className="text-h2-semibold text-foreground px-4 pt-4">
              {t('security.authenticatorApp.title', {
                defaultValue: 'Verify via Authenticator App',
              })}
            </div>
            <div className="flex flex-col p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start gap-1">
                  <p className="text-body-large-semibold text-foreground">
                    {t('security.authenticatorApp.labels.authenticatorApp', {
                      defaultValue: 'Authenticator App',
                    })}
                  </p>
                  <p className="text-body-large-regular text-muted-foreground">
                    {t('security.authenticatorApp.labels.addedOn', {
                      defaultValue: 'Added on: {{date}}',
                      date: addedOn,
                    })}
                  </p>
                </div>
                <Button variant="white-contained" onClick={() => setIsRemoveConfirmOpen(true)}>
                  <Trash01 className="size-6" />
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : isActivationStarted || setupChallengeId ? (
        <>
          <div className="bg-background flex h-full min-h-screen flex-col">
            <div className="sticky top-0 z-10 h-14 items-center justify-center">
              <Header
                label={t('security.authenticatorApp.confirmEmail.title', {
                  defaultValue: 'Confirm via email',
                })}
                onBack={() => router.back()}
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="mt-4 flex flex-1 flex-col gap-4">
                <div className="text-center">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('security.authenticatorApp.confirmEmail.description', {
                      defaultValue:
                        'Please enter the 6-digit verification code sent to your registered email.',
                    })}
                  </p>
                </div>

                <div className="flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputsRef.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={setupDigits[i] || ''}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onPaste={handleOtpPaste}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      aria-label={t('security.authenticatorApp.confirmEmail.otpAriaLabel', {
                        defaultValue: 'Email OTP digit {{index}}',
                        index: i + 1,
                      })}
                      className="border-border focus:border-primary-500 focus:ring-primary-50 h-10 w-10 shrink-0 rounded border text-center focus:ring-2"
                    />
                  ))}
                </div>
                <div className="text-center">
                  {resendCountdownSeconds > 0 && (
                    <p className="text-body-large-medium text-primary-500">
                      {t('security.authenticatorApp.confirmEmail.resendIn', {
                        defaultValue: 'Resend OTP in {{time}}',
                        time: resendCountdownDisplay,
                      })}
                    </p>
                  )}
                  {resendCountdownSeconds === 0 && (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isCreatingChallenge}
                      className="text-body-large-medium text-primary-500"
                    >
                      {t('security.authenticatorApp.confirmEmail.resendNow', {
                        defaultValue: 'Resend OTP now',
                      })}
                    </button>
                  )}
                </div>

                <div className="mt-auto">
                  <Button
                    variant="primary-contained"
                    className="w-full py-3"
                    disabled={!otpReady || isVerifying || isCreatingChallenge}
                    onClick={handleVerifyEmailOtp}
                  >
                    {isCreatingChallenge
                      ? t('security.authenticatorApp.actions.creating', {
                          defaultValue: 'Creating...',
                        })
                      : isVerifying
                        ? t('security.authenticatorApp.actions.verifying', {
                            defaultValue: 'Verifying...',
                          })
                        : t('security.authenticatorApp.actions.verify', {
                            defaultValue: 'Verify',
                          })}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bg-background flex h-full min-h-screen flex-col">
            <div className="sticky top-0 z-10 flex h-14 items-center justify-start">
              <Button
                variant="white-contained"
                className="h-10 w-10 p-0"
                onClick={() => router.push('/settings/security')}
              >
                <ChevronLeft className="size-6" />
              </Button>
            </div>
            <div className="text-h2-semibold text-foreground px-4 pt-4">
              {t('security.authenticatorApp.title', {
                defaultValue: 'Verify via Authenticator App',
              })}
            </div>
            <div className="px-4">
              <div className="flex flex-col items-center gap-6">
                <div className="flex h-72 w-72 items-center justify-center sm:h-72 sm:w-72">
                  {verificationAnimationData ? (
                    <Lottie
                      animationData={verificationAnimationData}
                      loop
                      className="h-72 w-72 sm:h-72 sm:w-72"
                    />
                  ) : (
                    <div className="bg-muted h-72 w-72 animate-pulse sm:h-72 sm:w-72" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-body-small-regular text-muted-foreground">
                    {t('security.authenticatorApp.description', {
                      defaultValue:
                        'Use authenticator apps like Google Authenticator for codes instead of SMS. This works even without an internet connection.',
                    })}
                  </p>
                </div>
              </div>
              <div className="bg-background fixed right-0 bottom-0 left-0 z-20">
                <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-4">
                  <div className="border-border bg-background rounded border px-2.5 py-1.5">
                    <div className="flex items-center gap-2">
                      <InfoHexagon className="text-muted-foreground size-5 shrink-0" />
                      <div className="flex min-w-0 flex-col items-start gap-0.5">
                        <p className="text-body-small-semibold text-foreground">
                          {t('security.authenticatorApp.guide.title', {
                            defaultValue: 'How to enable Authenticator app',
                          })}
                        </p>
                        <p className="text-body-small-regular text-primary-500">
                          {t('security.authenticatorApp.guide.learnMore', {
                            defaultValue: 'Learn more',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="primary-contained"
                      className="w-full py-2.5"
                      onClick={handleStartActivation}
                      disabled={isCreatingChallenge}
                    >
                      {t('security.authenticatorApp.actions.activate', {
                        defaultValue: 'Activate',
                      })}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
