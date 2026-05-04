import { Check, Eye, EyeOff } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import { cn } from '@/lib/utils';

import { SheetTopBar } from './SheetTopBar';
import type { PasswordValidation } from './types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

type ChangePasswordSheetProps = {
  open: boolean;
  hasPassword: boolean | null;
  t: Translate;
  changeOldPassword: string;
  setChangeOldPassword: (value: string) => void;
  changeNewPassword: string;
  setChangeNewPassword: (value: string) => void;
  changeConfirmPassword: string;
  setChangeConfirmPassword: (value: string) => void;
  showOldPassword: boolean;
  setShowOldPassword: (value: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (value: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (value: boolean) => void;
  passwordValidation: PasswordValidation;
  isChangingPassword: boolean;
  closeChangePasswordSheet: () => void;
  handleSavePassword: () => void;
  setIsChangePasswordSheetOpen: (open: boolean) => void;
};

function ValidationItem({ isValid, text }: { isValid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check
        className={cn('size-4 shrink-0', isValid ? 'text-green-500' : 'text-muted-foreground')}
      />
      <span
        className={cn(
          'text-body-small-regular',
          isValid ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {text}
      </span>
    </div>
  );
}

export function ChangePasswordSheet({
  open,
  hasPassword,
  t,
  changeOldPassword,
  setChangeOldPassword,
  changeNewPassword,
  setChangeNewPassword,
  changeConfirmPassword,
  setChangeConfirmPassword,
  showOldPassword,
  setShowOldPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwordValidation,
  isChangingPassword,
  closeChangePasswordSheet,
  handleSavePassword,
  setIsChangePasswordSheetOpen,
}: ChangePasswordSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) =>
        nextOpen ? setIsChangePasswordSheetOpen(true) : closeChangePasswordSheet()
      }
    >
      <SheetContent
        side="center"
        className="bg-background border-border mx-auto my-auto flex h-[80%] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border p-0"
        showCloseButton={false}
        title={t('security.changePasswordLabel')}
      >
        <SheetTopBar
          title={
            hasPassword
              ? t('security.changePasswordLabel')
              : t('security.setPasswordLabel', { defaultValue: 'Set password' })
          }
          onClose={closeChangePasswordSheet}
        />
        <div className="scrollbar-neutral-slim flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
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
                value={changeOldPassword}
                onChange={(event) => setChangeOldPassword(event.target.value)}
                rightAccessory={
                  <button
                    type="button"
                    aria-label={
                      showOldPassword
                        ? t('security.resetPassword.hidePassword')
                        : t('security.resetPassword.showPassword')
                    }
                    onClick={() => setShowOldPassword(!showOldPassword)}
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
              value={changeNewPassword}
              onChange={(event) => setChangeNewPassword(event.target.value)}
              rightAccessory={
                <button
                  type="button"
                  aria-label={
                    showNewPassword
                      ? t('security.resetPassword.hidePassword')
                      : t('security.resetPassword.showPassword')
                  }
                  onClick={() => setShowNewPassword(!showNewPassword)}
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
              value={changeConfirmPassword}
              onChange={(event) => setChangeConfirmPassword(event.target.value)}
              rightAccessory={
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? t('security.resetPassword.hidePassword')
                      : t('security.resetPassword.showPassword')
                  }
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1"
                >
                  {showConfirmPassword ? (
                    <Eye className="text-muted-foreground h-5 w-5" />
                  ) : (
                    <EyeOff className="text-muted-foreground h-5 w-5" />
                  )}
                </button>
              }
              className={cn(
                'h-12 border',
                changeConfirmPassword && !passwordValidation.passwordsMatch
                  ? 'border-red-500'
                  : 'border-border',
              )}
            />
            {changeConfirmPassword && !passwordValidation.passwordsMatch ? (
              <p className="text-body-small-regular mt-2 text-red-500">
                {t('security.resetPassword.passwordsNotMatch')}
              </p>
            ) : null}
          </div>

          <div className="mt-1">
            <div className="text-button-small-semibold text-foreground mb-3">
              {t('security.changePassword.passwordMustContain', {
                defaultValue: 'Your password must contain:',
              })}
            </div>
            <div className="flex flex-col gap-3">
              <ValidationItem
                isValid={passwordValidation.hasMinLength}
                text={t('security.resetPassword.passwordMinLength', {
                  defaultValue: 'At least 8 characters',
                })}
              />
              <ValidationItem
                isValid={passwordValidation.hasSpecialChar}
                text={t('security.resetPassword.passwordNeedsSpecial', {
                  defaultValue: 'At least 1 special character',
                })}
              />
              <ValidationItem
                isValid={passwordValidation.hasDigit}
                text={t('security.resetPassword.passwordNeedsNumber', {
                  defaultValue: 'At least 1 number',
                })}
              />
              <ValidationItem
                isValid={passwordValidation.hasUpperCase}
                text={t('security.resetPassword.passwordNeedsUppercase', {
                  defaultValue: 'At least 1 uppercase letter',
                })}
              />
              <ValidationItem
                isValid={passwordValidation.hasLowerCase}
                text={t('security.resetPassword.passwordNeedsLowercase', {
                  defaultValue: 'At least 1 lowercase letter',
                })}
              />
              {hasPassword ? (
                <ValidationItem
                  isValid={passwordValidation.isDifferentFromOld}
                  text={t('security.changePassword.sameAsOld', {
                    defaultValue: 'New password must be different from current password',
                  })}
                />
              ) : null}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <Button
              disabled={
                isChangingPassword ||
                !passwordValidation.hasMinLength ||
                !passwordValidation.hasSpecialChar ||
                !passwordValidation.hasDigit ||
                !passwordValidation.hasUpperCase ||
                !passwordValidation.hasLowerCase ||
                !passwordValidation.isDifferentFromOld ||
                !passwordValidation.passwordsMatch ||
                (hasPassword === true && changeOldPassword.length === 0)
              }
              className="h-12 w-full rounded"
              onClick={handleSavePassword}
            >
              {isChangingPassword
                ? t('security.resetPassword.submitting')
                : t('common.confirm', { defaultValue: 'Confirm' })}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
