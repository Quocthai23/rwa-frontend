// src/components/featured/forgot-password/ForgotPasswordInput.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import AppHeader from '@/components/shared/header/AppHeader';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';

type ForgotPasswordInputProps = {
  email: string;
  onBack: () => void;
  onContinue: (email: string) => void;
  onEmailChange: (email: string) => void;
};

const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-\.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export default function ForgotPasswordInput({
  email,
  onBack,
  onContinue,
  onEmailChange,
}: ForgotPasswordInputProps) {
  const [inputEmail, setInputEmail] = useState(email);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  useEffect(() => {
    setInputEmail(email);
  }, [email]);

  const inputRef = useRef<HTMLInputElement>(null);
  const { showError } = useToast();
  const handleInputFocus = () => {
    inputRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  };

  const trimmedEmail = inputEmail.trim();
  const isEmailValid = EMAIL_REGEX.test(trimmedEmail);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError('Invalid email format');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();

    if (!isEmailValid) {
      validateEmail(trimmedEmail);
      return;
    }

    setIsLoading(true);
    try {
      // Check if email exists
      const response = await authApi.checkEmail(trimmedEmail);

      // For forgot password, we expect the email to exist
      if (!response.exists) {
        showError(
          'Forgot password failed',
          'Email not found. Please check your email or register.',
        );
        return;
      }

      // Send OTP for reset password
      const otpResponse = await authApi.sendOTP(trimmedEmail, 'reset_password');
      if (otpResponse.success) {
        onContinue(trimmedEmail);
      } else {
        showError('OTP sending failed', 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Failed to send OTP';
      showError('OTP sending failed', message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="flex min-h-screen flex-col pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="relative flex flex-1 flex-col pt-4">
          <AppHeader label="Forgot Password" onBack={onBack} />

          <form id="forgot-password-email-form" className="flex-1 px-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-body-large-semibold text-foreground">Email Address</label>
              <Input
                ref={inputRef}
                autoComplete="email"
                inputMode="email"
                placeholder="Email"
                value={inputEmail}
                className="h-12 border border-neutral-200"
                onFocus={handleInputFocus}
                onChange={(event) => {
                  const nextEmail = event.target.value;
                  setInputEmail(nextEmail);
                  onEmailChange(nextEmail.trim());
                  if (emailError) setEmailError('');
                }}
                onBlur={() => validateEmail(inputEmail)}
              />
              {emailError && <p className="text-body-small-medium text-red-500">{emailError}</p>}
            </div>
          </form>

          <div className="bg-background mt-auto px-4 pb-5">
            <Button
              className="border-primary-500 bg-primary-500 h-12 w-full rounded border text-white"
              disabled={isLoading || !isEmailValid}
              type="submit"
              form="forgot-password-email-form"
            >
              {isLoading ? 'Loading...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
