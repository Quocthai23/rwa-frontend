'use client';

import { useMemo, useState } from 'react';
import { Check, Eye, EyeOff } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import AppHeader from '@/components/shared/header/AppHeader';
import { Input } from '@/components/shared/atoms/input';
import { useTranslation } from 'react-i18next';

type RegisterCreatePasswordProps = {
  email: string;
  registerToken: string;
  onBack: () => void;
  onContinue: (data: { email: string; token: string; password: string }) => void;
  onMissingData: () => void;
};

export default function RegisterCreatePassword({
  email,
  registerToken,
  onBack,
  onContinue,
  onMissingData,
}: RegisterCreatePasswordProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleContinue = () => {
    if (!email || !registerToken) {
      onMissingData();
      return;
    }

    if (!isValid) return;

    onContinue({ email, token: registerToken, password });
  };

  return (
    <div className="min-h-screen">
      <div className="bg-background flex min-h-screen flex-col pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="relative flex flex-1 flex-col pt-4">
          <AppHeader label="Password" onBack={onBack} />

          <div className="flex-1 px-4 py-6">
            <div className="relative">
              <Input
                placeholder="Password"
                autoCapitalize="none"
                autoCorrect="off"
                type={showPassword ? 'text' : 'password'}
                value={password}
                className="border-border h-12 border pr-12"
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
                  placeholder="Confirm password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  className="border-border h-12 border pr-12"
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
                  text={t('auth.register.passwordRuleMinLength', {
                    defaultValue: '8+ characters',
                  })}
                />
                <ValidationItem
                  isValid={hasSpecialChar}
                  text={t('auth.register.passwordRuleSpecial', {
                    defaultValue: 'Special character',
                  })}
                />
                <ValidationItem
                  isValid={hasDigit}
                  text={t('auth.register.passwordRuleNumber', {
                    defaultValue: 'Number',
                  })}
                />
                <ValidationItem
                  isValid={hasUpperCase}
                  text={t('auth.register.passwordRuleUppercase', {
                    defaultValue: 'Uppercase letter',
                  })}
                />
                <ValidationItem
                  isValid={hasLowerCase}
                  text={t('auth.register.passwordRuleLowercase', {
                    defaultValue: 'Lowercase letter',
                  })}
                />
              </div>
            </div>
          </div>

          <div className="bg-background mt-auto px-4 pb-5">
            <Button
              className="border-primary-500 bg-primary-500 h-12 w-full rounded border text-white"
              disabled={!isValid}
              onClick={handleContinue}
            >
              Continue
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

