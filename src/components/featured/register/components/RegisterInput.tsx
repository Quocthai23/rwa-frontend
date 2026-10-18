'use client';

import { useEffect, useRef, useState } from 'react';
import AppHeader from '@/components/shared/header/AppHeader';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { useTranslation } from 'react-i18next';

type RegisterInputProps = {
  email: string;
  onBack: () => void;
  onContinue: (email: string) => void;
  onEmailChange: (email: string) => void;
};

const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-\.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export default function RegisterInput({
  email,
  onBack,
  onContinue,
  onEmailChange,
}: RegisterInputProps) {
  const { t } = useTranslation();
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
      setEmailError(t('auth.login.emailRequired'));
      return false;
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError(t('auth.login.invalidEmail'));
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
      const response = await authApi.checkEmail(trimmedEmail);
      if (response.exists) {
        showError(
          t('auth.register.registerFailedTitle', { defaultValue: 'Register failed' }),
          t('auth.register.emailAlreadyRegistered', {
            defaultValue:
              'An account is already registered with this email. Please log in to continue.',
          }),
        );
        return;
      }

      const otpResponse = await authApi.sendOTP(trimmedEmail, 'register');
      if (otpResponse.success) {
        onContinue(trimmedEmail);
      } else {
        showError(
          t('security.resetPassword.otpSendFailedTitle'),
          t('security.resetPassword.otpSendFailedMessage'),
        );
      }
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : t('security.resetPassword.otpSendFailedMessage');
      showError(t('security.resetPassword.otpSendFailedTitle'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="flex min-h-screen flex-col pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="relative flex flex-1 flex-col pt-4">
          <AppHeader label={t('auth.register.title')} onBack={onBack} />

          <form id="register-email-form" className="flex-1 px-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-body-large-semibold text-foreground">
                {t('auth.login.emailAddress')}
              </label>
              <Input
                ref={inputRef}
                autoComplete="email"
                inputMode="email"
                placeholder={t('auth.login.emailPlaceholder')}
                value={inputEmail}
                className="border-border h-12 border"
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
              form="register-email-form"
            >
              {isLoading ? t('auth.login.loading') : t('transfer.verifyOtp.continue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

