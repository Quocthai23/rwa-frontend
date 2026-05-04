'use client';

import { Check, Eye, EyeOff } from '@untitledui/icons';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';

type ChangePasswordContentProps = {
  hasPassword: boolean;
};

export default function ChangePasswordContent({ hasPassword }: ChangePasswordContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { showError, showSuccess } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    hasDigit,
    hasLowerCase,
    hasMinLength,
    hasSpecialChar,
    hasUpperCase,
    isDifferentFromOld,
    passwordsMatch,
  } = useMemo(() => {
    const min = newPassword.length >= 8;
    const special = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const upper = /[A-Z]/.test(newPassword);
    const lower = /[a-z]/.test(newPassword);
    const digit = /\d/.test(newPassword);
    const match = newPassword.length > 0 && newPassword === confirmPassword;
    const different = hasPassword
      ? oldPassword.length > 0 && newPassword.length > 0 && oldPassword !== newPassword
      : newPassword.length > 0;

    return {
      hasDigit: digit,
      hasLowerCase: lower,
      hasMinLength: min,
      hasSpecialChar: special,
      hasUpperCase: upper,
      isDifferentFromOld: different,
      passwordsMatch: match,
    };
  }, [confirmPassword, hasPassword, newPassword, oldPassword]);

  const handleConfirm = useCallback(async () => {
    if (hasPassword && !oldPassword.trim()) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.changePassword.enterOldPassword', {
          defaultValue: 'Please enter your current password',
        }),
      );
      return;
    }
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

    if (hasPassword && oldPassword === newPassword) {
      showError(
        t('security.resetPassword.changeFailedTitle'),
        t('security.changePassword.sameAsOld', {
          defaultValue: 'New password must be different from current password',
        }),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.changePassword(hasPassword ? oldPassword : undefined, newPassword);
      await authApi.logout().catch(() => undefined);
      tokenStorage.clearToken();
      logout();
      showSuccess(
        t('security.changePassword.changeSuccessTitle', { defaultValue: 'Password changed' }),
        t('security.changePassword.changeSuccessMessage', {
          defaultValue: 'Your password has been changed successfully.',
        }),
      );
      router.replace('/login');
    } catch {
      showError(
        t('security.changePassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.changePassword.changeFailedMessage', {
          defaultValue: 'Failed to change password. Please try again.',
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    confirmPassword,
    hasPassword,
    logout,
    newPassword,
    oldPassword,
    router,
    showError,
    showSuccess,
    t,
  ]);

  const isFormValid =
    (!hasPassword || oldPassword.length > 0) &&
    hasMinLength &&
    hasSpecialChar &&
    hasUpperCase &&
    hasLowerCase &&
    hasDigit &&
    isDifferentFromOld &&
    passwordsMatch;
  const isConfirmPasswordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const titleLabel = hasPassword
    ? t('security.changePasswordLabel')
    : t('security.setPasswordLabel', { defaultValue: 'Set password' });

  return (
    <div className="bg-background min-h-screen">
      <Header label={titleLabel} />

      <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-none flex-col px-4 pt-4 pb-6 lg:px-8">
        <div className="mt-6 flex flex-col gap-5">
          {hasPassword ? (
            <div>
              <label className="text-body-large-semibold text-foreground mb-2 block">
                {t('security.changePassword.oldPassword', { defaultValue: 'Current Password' })}
              </label>
              <Input
                placeholder={t('security.changePassword.oldPasswordPlaceholder', {
                  defaultValue: 'Current password',
                })}
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                rightAccessory={
                  <button
                    type="button"
                    aria-label={
                      showOldPassword
                        ? t('security.resetPassword.hidePassword')
                        : t('security.resetPassword.showPassword')
                    }
                    onClick={() => setShowOldPassword((value) => !value)}
                    className="p-1"
                  >
                    {showOldPassword ? (
                      <Eye className="text-muted-foreground h-5 w-5" />
                    ) : (
                      <EyeOff className="text-muted-foreground h-5 w-5" />
                    )}
                  </button>
                }
                className="border-border h-12 border"
              />
            </div>
          ) : null}

          <div>
            <label className="text-body-large-semibold text-foreground mb-2 block">
              {t('security.changePassword.newPassword', {
                defaultValue: t('security.resetPassword.newPassword'),
              })}
            </label>
            <Input
              placeholder={t('security.changePassword.newPasswordPlaceholder', {
                defaultValue: t('security.resetPassword.newPasswordPlaceholder'),
              })}
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
              {t('security.changePassword.confirmPassword', {
                defaultValue: t('security.resetPassword.confirmPassword'),
              })}
            </label>
            <Input
              placeholder={t('security.changePassword.confirmPasswordPlaceholder', {
                defaultValue: t('security.resetPassword.confirmPasswordPlaceholder'),
              })}
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
                {t('security.changePassword.passwordsNotMatch', {
                  defaultValue: t('security.resetPassword.passwordsNotMatch'),
                })}
              </p>
            )}
          </div>

          <div className="mt-1">
            <div className="text-button-small-semibold text-foreground mb-3">
              {t('security.changePassword.passwordMustContain', {
                defaultValue: 'Your password must contain:',
              })}
            </div>
            <div className="flex flex-col gap-3">
              <ValidationItem
                isValid={hasMinLength}
                text={t('security.resetPassword.passwordMinLength', {
                  defaultValue: 'At least 8 characters',
                })}
              />
              <ValidationItem
                isValid={hasSpecialChar}
                text={t('security.resetPassword.passwordNeedsSpecial', {
                  defaultValue: 'At least 1 special character',
                })}
              />
              <ValidationItem
                isValid={hasDigit}
                text={t('security.resetPassword.passwordNeedsNumber', {
                  defaultValue: 'At least 1 number',
                })}
              />
              <ValidationItem
                isValid={hasUpperCase}
                text={t('security.resetPassword.passwordNeedsUppercase', {
                  defaultValue: 'At least 1 uppercase letter',
                })}
              />
              <ValidationItem
                isValid={hasLowerCase}
                text={t('security.resetPassword.passwordNeedsLowercase', {
                  defaultValue: 'At least 1 lowercase letter',
                })}
              />
              {hasPassword ? (
                <ValidationItem
                  isValid={isDifferentFromOld}
                  text={t('security.changePassword.sameAsOld', {
                    defaultValue: 'New password must be different from current password',
                  })}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <Button
            disabled={!isFormValid || isSubmitting}
            className="h-12 w-full rounded"
            onClick={handleConfirm}
          >
            {isSubmitting
              ? t('security.changePassword.submitting', {
                  defaultValue: t('security.resetPassword.submitting'),
                })
              : t('security.changePassword.continue', {
                  defaultValue: t('security.resetPassword.continue'),
                })}
          </Button>
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
          isValid ? 'bg-green-500' : 'bg-neutral-300'
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
