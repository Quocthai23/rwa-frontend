// src/components/featured/forgot-password/ForgotPasswordVerifyOTP.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import AppHeader from '@/components/shared/header/AppHeader';

import { Button } from '@/components/shared/atoms/button';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';

type ForgotPasswordVerifyOTPProps = {
  email: string;
  onBack: () => void;
  onContinue: (data: { email: string; token: string }) => void;
  onMissingEmail: () => void;
};

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function ForgotPasswordVerifyOTP({
  email,
  onBack,
  onContinue,
  onMissingEmail,
}: ForgotPasswordVerifyOTPProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const { showError, showSuccess } = useToast();
  useEffect(() => {
    if (!email) {
      onMissingEmail();
      return;
    }

    setCanResend(false);
    setResendCountdown(60);
  }, [email, onMissingEmail]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    } else if (resendCountdown === 0 && !canResend) {
      setCanResend(true);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCountdown, canResend]);

  const onSubmit = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();

    if (otp.length !== 6) {
      const message = 'Please enter 6 digits';
      showError('Forgot password failed', message);
      return;
    }

    if (!email) {
      showError('Forgot password failed', 'Email is missing');
      onMissingEmail();
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyOTP(email, otp, 'reset_password');
      onContinue({ email, token: response.token });
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Invalid code. Please try again.';
      showError('Forgot password failed', message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || !email) return;

    try {
      setCanResend(false);
      setResendCountdown(60);
      const response = await authApi.sendOTP(email, 'reset_password');
      if (response.success) {
        showSuccess(
          'A new verification code has been sent',
          'Please check your email for the OTP.',
        );
      } else {
        showError('OTP sending failed', 'Failed to send OTP. Please try again.');
        setCanResend(true);
        setResendCountdown(0);
      }
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Failed to send OTP';
      showError('OTP sending failed', message || 'Failed to send OTP. Please try again.');
      setCanResend(true);
      setResendCountdown(0);
    }
  };

  const handleOtpChange = (index: number, rawValue: string) => {
    const clean = rawValue.replace(/[^0-9]/g, '');
    if (!clean) {
      setOtp((prev) => {
        const next = prev.padEnd(6, '').split('');
        next[index] = '';
        return next.join('').slice(0, 6);
      });
      return;
    }

    setOtp((prev) => {
      const next = prev.padEnd(6, '').split('');
      next[index] = clean[clean.length - 1];
      return next.join('').slice(0, 6);
    });

    inputsRef.current[index + 1]?.focus();
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 6);
    if (!pasted) return;

    setOtp(pasted);
    inputsRef.current[Math.min(pasted.length, 6) - 1]?.focus();
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Backspace') return;

    if (otp[index]) {
      setOtp((prev) => {
        const next = prev.padEnd(6, '').split('');
        next[index] = '';
        return next.join('').slice(0, 6);
      });
      return;
    }

    const prevIndex = index - 1;
    if (prevIndex < 0) return;

    setOtp((prev) => {
      const next = prev.padEnd(6, '').split('');
      next[prevIndex] = '';
      return next.join('').slice(0, 6);
    });
    inputsRef.current[prevIndex]?.focus();
  };

  return (
    <div className="min-h-screen">
      <div className="bg-background flex min-h-screen flex-col pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="relative flex flex-1 flex-col pt-4">
          <AppHeader label="Enter verification code" onBack={onBack} />

          <div className="px-4">
            <div className="flex flex-col items-center gap-2">
              <div className="text-body-large-regular text-muted-foreground">
                We&apos;ve sent the code to
              </div>
              <div className="text-body-large-semibold text-foreground">{email}</div>
            </div>

            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index] || ''}
                  onChange={(event) => handleOtpChange(index, event.target.value)}
                  onPaste={handleOtpPaste}
                  onKeyDown={(event) => handleOtpKeyDown(event, index)}
                  aria-label={`OTP digit ${index + 1}`}
                  className="border-border bg-background text-foreground focus:border-primary-500 focus:ring-primary-500/20 h-10 w-10 rounded border text-center focus:ring-2 focus:outline-none"
                />
              ))}
            </div>

            <button
              type="button"
              className="mt-6 flex w-full items-center justify-center"
              disabled={!canResend}
              onClick={handleResendCode}
            >
              {canResend ? (
                <span className="text-button-large-medium text-primary-500">Resend code</span>
              ) : (
                <span className="text-button-large-medium text-muted-foreground">
                  Resend code in{' '}
                  <span className="text-button-large-medium text-primary-500">
                    {formatCountdown(resendCountdown)}
                  </span>
                </span>
              )}
            </button>
          </div>

          <div className="bg-background mt-auto px-4 pb-5">
            <form id="forgot-password-verify-otp-form" onSubmit={onSubmit}>
              <Button
                className="border-primary-500 bg-primary-500 h-12 w-full rounded border text-white"
                disabled={isLoading || otp.length !== 6}
                type="submit"
                form="forgot-password-verify-otp-form"
              >
                {isLoading ? 'Loading...' : 'Continue'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

