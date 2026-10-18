'use client';

import { useMemo, useState } from 'react';
import { Check, Eye, EyeOff } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import AppHeader from '@/components/shared/header/AppHeader';
import { Input } from '@/components/shared/atoms/input';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { useTranslation } from 'react-i18next';

type ForgotPasswordCreateNewPasswordProps = {
  email: string;
  resetToken: string;
  onBack: () => void;
  onSuccess: () => void;
  onMissingData: () => void;
};

export default function ForgotPasswordCreateNewPassword({
  email,
  resetToken,
  onBack,
  onSuccess,
  onMissingData,
}: ForgotPasswordCreateNewPasswordProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useToast();
  const { hasMinLength, hasSpecialChar, hasUpperCase, hasLowerCase, hasDigit, passwordsMatch } =
    useMemo(() => {
      const min = password.length >= 8;
      const special = /[!@#VNĐ%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      const upper = /[A-Z]/.test(password);
      const lower = /[a-z]/.test(password);
      const digit = /\d/.test(password);
      const match = password.length > 0 && password === confirmPassword;

      return {
        hasMinLength: min,
        hasSpecialChar: special,
        hasUpperCase: upper,
        hasLowerCase: lower,
        hasDigit: digit,
        passwordsMatch: match,
      };
    }, [password, confirmPassword]);

  const isValid =
    hasMinLength && hasSpecialChar && hasUpperCase && hasLowerCase && hasDigit && passwordsMatch;

  const handleSubmit = async () => {
    if (!email || !resetToken) {
      onMissingData();
      return;
    }

    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.resetPassword(resetToken, password);

      if (response.success) {
        showSuccess('Reset successful', 'Password reset successfully.');
        onSuccess();
      }
    } catch (error: any) {
      let message = 'Failed to reset password';
      const apiErrors = error?.errors || error;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        message = apiErrors[0].message || apiErrors[0].msg || JSON.stringify(apiErrors);
      } else if (typeof apiErrors === 'object' && apiErrors.message) {
        message = apiErrors.message;
      } else if (typeof apiErrors === 'string') {
        message = apiErrors;
      }

      showError('Reset failed', message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="bg-background flex min-h-screen flex-col pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="relative flex flex-1 flex-col pt-4">
          <AppHeader label="Reset Password" onBack={onBack} />

          <div className="flex-1 px-4 py-6">
            <div className="relative">
              <Input
                placeholder="New Password"
                autoCapitalize="none"
                autoCorrect="off"
                type={showPassword ? 'text' : 'password'}
                value={password}
                className="h-12 border border-neutral-200 pr-12"
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                type="button"
                variant="white-contained"
                className="absolute top-1/2 right-2 -translate-y-1/2 bg-transparent"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <Eye className="text-muted-foreground h-5 w-5" />
                ) : (
                  <EyeOff className="text-muted-foreground h-5 w-5" />
                )}
              </Button>
            </div>

            <div className="mt-4">
              <div className="relative">
                <Input
                  placeholder="Confirm new password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  className="h-12 border border-neutral-200 pr-12"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <Button
                  type="button"
                  variant="white-contained"
                  className="absolute top-1/2 right-2 -translate-y-1/2 bg-transparent"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <Eye className="text-muted-foreground h-5 w-5" />
                  ) : (
                    <EyeOff className="text-muted-foreground h-5 w-5" />
                  )}
                </Button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <div className="mt-2 text-sm text-red-500">
                  {t('security.resetPassword.passwordsNotMatch')}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="text-button-small-semibold text-foreground mb-3">
                {t('security.resetPassword.passwordMustContain', {
                  defaultValue: 'Your password must contain:',
                })}
              </div>

              <div className="flex flex-col gap-3">
                <ValidationItem
                  isValid={hasMinLength}
                  text={t('security.resetPassword.passwordMinLength')}
                />
                <ValidationItem
                  isValid={hasSpecialChar}
                  text={t('security.resetPassword.passwordNeedsSpecial')}
                />
                <ValidationItem
                  isValid={hasDigit}
                  text={t('security.resetPassword.passwordNeedsNumber')}
                />
                <ValidationItem
                  isValid={hasUpperCase}
                  text={t('security.resetPassword.passwordNeedsUppercase')}
                />
                <ValidationItem
                  isValid={hasLowerCase}
                  text={t('security.resetPassword.passwordNeedsLowercase')}
                />
              </div>
            </div>
          </div>

          <div className="bg-background mt-auto px-4 pb-5">
            <Button
              className="border-primary-500 bg-primary-500 h-12 w-full rounded border text-white"
              disabled={isLoading || !isValid}
              onClick={handleSubmit}
            >
              {isLoading ? 'Loading...' : 'Reset Password'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValidationItem({ isValid, text }: { isValid: boolean; text: string }) {
  return (
    <div className="flex flex-row items-center">
      <div
        className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full ${
          isValid ? 'bg-green-500' : 'bg-muted'
        }`}
      >
        <Check size={13} color="white" strokeWidth={3} />
      </div>
      <div
        className={`text-button-small-medium ${isValid ? 'text-green-500' : 'text-muted-foreground'}`}
      >
        {text}
      </div>
    </div>
  );
}

