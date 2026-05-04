'use client';

import { Eye, EyeOff } from '@untitledui/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { authApi } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { useTranslation } from 'react-i18next';

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  const visible = local.slice(0, 2);

  return `${visible}***@${domain}`;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ResetPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { showError, showSuccess } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const email = user?.email ?? '';

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleGetCode = useCallback(async () => {
    if (!email || countdown > 0 || isSendingCode) return;
    setIsSendingCode(true);
    try {
      await authApi.sendOTP(email, 'reset_password');
      setCodeSent(true);
      setCountdown(60);
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    } catch {
      showError(
        t('security.resetPassword.otpSendFailedTitle'),
        t('security.resetPassword.otpSendFailedMessage'),
      );
    } finally {
      setIsSendingCode(false);
    }
  }, [countdown, email, isSendingCode, showError, t]);

  const handleConfirm = useCallback(async () => {
    if (!newPassword.trim()) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.resetPassword.enterNewPassword'),
      );
      return;
    }
    if (newPassword.length < 8) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.resetPassword.passwordMinLength'),
      );
      return;
    }
    if (!/(?=.*[a-z])/.test(newPassword)) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.resetPassword.passwordNeedsLowercase'),
      );
      return;
    }
    if (!/(?=.*[A-Z])/.test(newPassword)) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.resetPassword.passwordNeedsUppercase'),
      );
      return;
    }
    if (!/(?=.*\d)/.test(newPassword)) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.resetPassword.passwordNeedsNumber'),
      );
      return;
    }
    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(newPassword)) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.resetPassword.passwordNeedsSpecial'),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.resetPassword.passwordsNotMatch'),
      );
      return;
    }

    const otp = emailCode.trim();
    if (!otp) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.resetPassword.enterVerificationCode'),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { token } = await authApi.verifyOTP(email, otp, 'reset_password');
      try {
        await authApi.resetPassword(token, newPassword);
        showSuccess(
          t('security.resetPassword.resetSuccessTitle'),
          t('security.resetPassword.resetSuccessMessage'),
        );
        router.back();
      } catch {
        showError(
          t('security.resetPassword.resetFailedTitle'),
          t('security.resetPassword.resetFailedMessage'),
        );
      }
    } catch {
      showError(
        t('security.resetPassword.invalidCodeTitle'),
        t('security.resetPassword.invalidCodeMessage'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [confirmPassword, email, emailCode, newPassword, router, showError, showSuccess, t]);

  const isFormValid =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    emailCode.trim().length > 0 &&
    codeSent;
  const isConfirmPasswordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <div className="bg-background min-h-screen">
      <Header label={t('security.resetPassword.title')} />

      <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-xl flex-col px-4 pt-4 pb-6">
        <div className="bg-primary-50 rounded px-3 py-2">
          <p className="text-body-small-medium text-blue-500">
            {t('security.resetPassword.notice')}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          <div>
            <label className="text-body-large-semibold text-foreground mb-2 block">
              {t('security.resetPassword.newPassword')}
            </label>
            <Input
              placeholder={t('security.resetPassword.newPasswordPlaceholder')}
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              rightAccessory={
                <button
                  type="button"
                  aria-label={
                    showNewPassword
                      ? t('security.resetPassword.hidePassword')
                      : t('security.resetPassword.showPassword')
                  }
                  onClick={() => setShowNewPassword((value) => !value)}
                  className="p-1"
                >
                  {showNewPassword ? (
                    <Eye className="text-muted-foreground h-5 w-5" />
                  ) : (
                    <EyeOff className="text-muted-foreground h-5 w-5" />
                  )}
                </button>
              }
              className="border-border h-12 border"
            />
          </div>

          <div>
            <label className="text-body-large-semibold text-foreground mb-2 block">
              {t('security.resetPassword.confirmPassword')}
            </label>
            <Input
              placeholder={t('security.resetPassword.confirmPasswordPlaceholder')}
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              rightAccessory={
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? t('security.resetPassword.hidePassword')
                      : t('security.resetPassword.showPassword')
                  }
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="p-1"
                >
                  {showConfirmPassword ? (
                    <Eye className="text-muted-foreground h-5 w-5" />
                  ) : (
                    <EyeOff className="text-muted-foreground h-5 w-5" />
                  )}
                </button>
              }
              className={`h-12 border ${
                isConfirmPasswordMismatch ? 'border-red-500' : 'border-border'
              }`}
            />
            {isConfirmPasswordMismatch && (
              <p className="text-body-small-regular mt-2 text-red-500">
                {t('security.resetPassword.passwordsNotMatch')}
              </p>
            )}
          </div>

          <div>
            <label className="text-body-large-semibold text-foreground mb-2 block">
              {t('security.resetPassword.emailVerification')}
            </label>
            <Input
              inputMode="numeric"
              placeholder={
                codeSent
                  ? t('security.resetPassword.enterVerificationCodePlaceholder')
                  : maskEmail(email)
              }
              value={emailCode}
              disabled={!codeSent}
              onChange={(event) => setEmailCode(event.target.value)}
              rightAccessory={
                <button
                  type="button"
                  disabled={isSendingCode || countdown > 0}
                  onClick={handleGetCode}
                  className="text-button-large-medium text-primary-500"
                >
                  {isSendingCode
                    ? '...'
                    : countdown > 0
                      ? formatCountdown(countdown)
                      : codeSent
                        ? t('security.resetPassword.resend')
                        : t('security.resetPassword.getCode')}
                </button>
              }
              className="border-border h-12 border"
            />
          </div>
        </div>

        <div className="mt-auto pt-6">
          <Button
            disabled={!isFormValid || isSubmitting}
            className="h-12 w-full rounded"
            onClick={handleConfirm}
          >
            {isSubmitting
              ? t('security.resetPassword.submitting')
              : t('security.resetPassword.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
