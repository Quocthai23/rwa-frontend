'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from '@untitledui/icons';

import { CircleProgress } from '@/components/featured/security/components/CircleProgress';
import { AuthenticatorSheet } from '@/components/featured/security/web/components/AuthenticatorSheet';
import { ChangePasswordSheet } from '@/components/featured/security/web/components/ChangePasswordSheet';
import { DeleteAccountSheet } from '@/components/featured/security/web/components/DeleteAccountSheet';
import { DisableAuthenticatorConfirmSheet } from '@/components/featured/security/web/components/DisableAuthenticatorConfirmSheet';
import type {
  AuthenticatorStage,
  OtpFactor,
  PasswordValidation,
} from '@/components/featured/security/web/components/types';
import { Button } from '@/components/shared/atoms/button';
import SplashLogo from '@/components/shared/SplashLogo';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { authApi } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

type SecurityActionRowProps = {
  label: string;
  onClick: () => void;
  rightElement?: ReactNode;
  destructive?: boolean;
};

const OTP_DIGITS_LENGTH = 6;

function SecurityActionRow({ label, onClick, rightElement, destructive }: SecurityActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:bg-muted flex w-full items-center justify-between rounded border-b py-4 text-left transition-colors last:border-b-0"
    >
      <span
        className={cn(
          'text-body-large-medium-semibold flex-1 px-3',
          destructive && 'px-3 text-red-500',
        )}
      >
        {label}
      </span>
      {rightElement ?? <ChevronRight size={20} className="text-muted-foreground" />}
    </button>
  );
}

export default function SecurityWebScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError, showInfo, showSuccess } = useToast();
  const isAuthHydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [enabledMfa, setEnabledMfa] = useState<boolean | null>(null);
  const [authenticatorData, setAuthenticatorData] = useState<string | null>(null);

  const [isChangePasswordSheetOpen, setIsChangePasswordSheetOpen] = useState(false);
  const [isAuthenticatorSheetOpen, setIsAuthenticatorSheetOpen] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);

  const [changeOldPassword, setChangeOldPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [authenticatorStage, setAuthenticatorStage] = useState<AuthenticatorStage>('overview');
  const [authenticatorChallengeId, setAuthenticatorChallengeId] = useState<string | null>(null);
  const [authenticatorDigits, setAuthenticatorDigits] = useState<string[]>(
    Array(OTP_DIGITS_LENGTH).fill(''),
  );
  const [authenticatorOtpAuthUrl, setAuthenticatorOtpAuthUrl] = useState<string | null>(null);
  const [authenticatorSecret, setAuthenticatorSecret] = useState<string | null>(null);
  const [authenticatorQrDataUrl, setAuthenticatorQrDataUrl] = useState<string | null>(null);
  const [authenticatorVerifyFactor, setAuthenticatorVerifyFactor] = useState<OtpFactor>('TOTP');
  const [isAuthenticatorWorking, setIsAuthenticatorWorking] = useState(false);
  const [isCopyingSecret, setIsCopyingSecret] = useState(false);
  const [isRemovingAuthenticator, setIsRemovingAuthenticator] = useState(false);
  const [disableNoticeAccepted, setDisableNoticeAccepted] = useState(false);
  const [disableSecurityRiskAccepted, setDisableSecurityRiskAccepted] = useState(false);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const authenticatorSetupReady = authenticatorDigits.every((digit) => digit.length === 1);
  const authenticatorAddedOn = useMemo(() => {
    const fallback = 'Nov 9, 2022';
    if (!authenticatorData) return fallback;

    try {
      const parsed = JSON.parse(authenticatorData) as {
        addedOn?: string;
        createdAt?: string;
        createdOn?: string;
      };
      const rawDate = parsed.addedOn ?? parsed.createdAt ?? parsed.createdOn;
      if (!rawDate) return fallback;

      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) return fallback;

      return parsedDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return fallback;
    }
  }, [authenticatorData]);

  const securityScore = Number(hasPassword === true) + Number(enabledMfa === true);
  const isStrongSecurity = securityScore === 2;
  const isReady = hasPassword !== null && enabledMfa !== null;

  const passwordValidation: PasswordValidation = useMemo(() => {
    return {
      hasMinLength: changeNewPassword.length >= 8,
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(changeNewPassword),
      hasUpperCase: /[A-Z]/.test(changeNewPassword),
      hasLowerCase: /[a-z]/.test(changeNewPassword),
      hasDigit: /\d/.test(changeNewPassword),
      passwordsMatch: changeNewPassword.length > 0 && changeNewPassword === changeConfirmPassword,
      isDifferentFromOld:
        hasPassword === false ||
        (changeOldPassword.length > 0 &&
          changeNewPassword.length > 0 &&
          changeOldPassword !== changeNewPassword),
    };
  }, [changeConfirmPassword, changeNewPassword, changeOldPassword, hasPassword]);

  const closeChangePasswordSheet = useCallback(() => {
    setIsChangePasswordSheetOpen(false);
    setChangeOldPassword('');
    setChangeNewPassword('');
    setChangeConfirmPassword('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsChangingPassword(false);
  }, []);

  const resetAuthenticatorDigits = useCallback(() => {
    setAuthenticatorDigits(Array(OTP_DIGITS_LENGTH).fill(''));
  }, []);

  const closeAuthenticatorSheet = useCallback(() => {
    setIsAuthenticatorSheetOpen(false);
    setIsDisableConfirmOpen(false);
    setAuthenticatorStage('overview');
    setAuthenticatorChallengeId(null);
    setAuthenticatorOtpAuthUrl(null);
    setAuthenticatorSecret(null);
    setAuthenticatorQrDataUrl(null);
    setAuthenticatorVerifyFactor('TOTP');
    setIsAuthenticatorWorking(false);
    setIsRemovingAuthenticator(false);
    setDisableNoticeAccepted(false);
    setDisableSecurityRiskAccepted(false);
    resetAuthenticatorDigits();
  }, [resetAuthenticatorDigits]);

  const closeDeleteSheet = useCallback(() => {
    setIsDeleteSheetOpen(false);
    setIsDeletingAccount(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      try {
        const me = await authApi.getMe();
        if (cancelled) return;

        setHasPassword(Boolean(me.hasPassword));
        setEnabledMfa(Boolean(me.enabledMfa));

        if (me.enabledMfa) {
          const storedAuthenticatorData = localStorage.getItem('authenticator-app-data');
          if (storedAuthenticatorData) {
            setAuthenticatorData(storedAuthenticatorData);
          } else {
            const nextAuthenticatorData = JSON.stringify({ addedOn: new Date().toISOString() });
            localStorage.setItem('authenticator-app-data', nextAuthenticatorData);
            localStorage.setItem('authenticator-app-verified', 'true');
            setAuthenticatorData(nextAuthenticatorData);
          }
        } else {
          localStorage.removeItem('authenticator-app-data');
          localStorage.removeItem('authenticator-app-verified');
          setAuthenticatorData(null);
        }
      } catch {
        if (cancelled) return;
        setHasPassword(true);
        setEnabledMfa(false);
      }
    };

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authenticatorOtpAuthUrl || authenticatorStage !== 'setup-link') {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const qrcode = await import('qrcode');
        const dataUrl = await qrcode.toDataURL(authenticatorOtpAuthUrl, { margin: 1, width: 220 });
        if (!cancelled) {
          setAuthenticatorQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setAuthenticatorQrDataUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticatorOtpAuthUrl, authenticatorStage]);

  useEffect(() => {
    if (!isAuthenticatorSheetOpen) return;

    setAuthenticatorStage('overview');
  }, [isAuthenticatorSheetOpen]);

  const requireLogin = useCallback(
    async <T,>(task: () => Promise<T> | T): Promise<T | void> => {
      if (!isAuthHydrated) {
        return;
      }

      // In the Settings web flow, keep users in-place instead of forcing a route jump.
      // If profile data has already loaded, allow continuing even when store auth flag is stale.
      if (!isAuthenticated && hasPassword === null && enabledMfa === null) {
        showError(
          t('auth.loginRequired', { defaultValue: 'Login required' }),
          t('auth.loginRequiredDescription', {
            defaultValue: 'Your session is not ready. Please login again.',
          }),
        );
        return;
      }

      return task();
    },
    [enabledMfa, hasPassword, isAuthHydrated, isAuthenticated, showError, t],
  );

  const handleOpenChangePassword = useCallback(() => {
    setIsChangePasswordSheetOpen(true);
  }, []);

  const handleOpenAuthenticator = useCallback(() => {
    setAuthenticatorStage(enabledMfa ? 'overview' : 'overview');
    setIsAuthenticatorSheetOpen(true);
  }, [enabledMfa]);

  const handleOpenDelete = useCallback(() => {
    setIsDeleteSheetOpen(true);
  }, []);

  const handleSavePassword = useCallback(async () => {
    if (isChangingPassword) return;

    if (hasPassword && !changeOldPassword.trim()) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.changePassword.enterOldPassword', {
          defaultValue: 'Please enter your current password',
        }),
      );
      return;
    }
    if (!changeNewPassword.trim()) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.resetPassword.enterNewPassword'),
      );
      return;
    }
    if (changeNewPassword.length < 8) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.resetPassword.passwordMinLength'),
      );
      return;
    }
    if (!/(?=.*[a-z])/.test(changeNewPassword)) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.resetPassword.passwordNeedsLowercase'),
      );
      return;
    }
    if (!/(?=.*[A-Z])/.test(changeNewPassword)) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.resetPassword.passwordNeedsUppercase'),
      );
      return;
    }
    if (!/(?=.*\d)/.test(changeNewPassword)) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.resetPassword.passwordNeedsNumber'),
      );
      return;
    }
    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(changeNewPassword)) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.resetPassword.passwordNeedsSpecial'),
      );
      return;
    }
    if (changeNewPassword !== changeConfirmPassword) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.resetPassword.passwordsNotMatch'),
      );
      return;
    }
    if (hasPassword && changeOldPassword === changeNewPassword) {
      showError(
        t('security.resetPassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        t('security.changePassword.sameAsOld', {
          defaultValue: 'New password must be different from current password',
        }),
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(hasPassword ? changeOldPassword : undefined, changeNewPassword);
      await authApi.logout().catch(() => undefined);
      tokenStorage.clearToken();
      logout();
      showSuccess(
        t('security.changePassword.changeSuccessTitle', { defaultValue: 'Password changed' }),
        t('security.changePassword.changeSuccessMessage', {
          defaultValue: 'Your password has been changed successfully.',
        }),
      );
      closeChangePasswordSheet();
      router.push('/login');
    } catch (error: unknown) {
      showError(
        t('security.changePassword.changeFailedTitle', { defaultValue: 'Change password failed' }),
        localizeApiError(error, t),
      );
    } finally {
      setIsChangingPassword(false);
    }
  }, [
    changeConfirmPassword,
    changeNewPassword,
    changeOldPassword,
    closeChangePasswordSheet,
    hasPassword,
    isChangingPassword,
    logout,
    router,
    showError,
    showSuccess,
    t,
  ]);

  const startAuthenticatorSetup = useCallback(async () => {
    if (isAuthenticatorWorking) return;

    setIsAuthenticatorWorking(true);
    try {
      const res = await requireLogin(() => authApi.createAuthChallenge({ purpose: 'SETUP_MFA' }));
      if (!res) return;

      const challenge = {
        challengeId: res.challengeId,
        purpose: 'SETUP_MFA' as const,
        requiredFactors: res.requiredFactors.filter(
          (factor): factor is OtpFactor => factor === 'TOTP' || factor === 'EMAIL_OTP',
        ),
      };

      localStorage.setItem(
        'mfa-flow',
        JSON.stringify({
          ...challenge,
          expiresAt: res.expiresAt,
        }),
      );

      setAuthenticatorChallengeId(res.challengeId);
      setAuthenticatorDigits(Array(OTP_DIGITS_LENGTH).fill(''));
      setAuthenticatorOtpAuthUrl(null);
      setAuthenticatorSecret(null);
      setAuthenticatorQrDataUrl(null);
      setAuthenticatorStage('setup-email');
    } catch (error: unknown) {
      showError(
        t('security.authenticatorApp.errors.createChallengeFailedTitle', {
          defaultValue: 'Failed to start setup',
        }),
        localizeApiError(error, t),
      );
    } finally {
      setIsAuthenticatorWorking(false);
    }
  }, [isAuthenticatorWorking, requireLogin, showError, t]);

  const handleAuthenticatorDigitChange = useCallback((index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (!clean) {
      setAuthenticatorDigits((previous) => {
        const next = [...previous];
        next[index] = '';
        return next;
      });
      return;
    }

    setAuthenticatorDigits((previous) => {
      const next = [...previous];
      next[index] = clean[clean.length - 1];
      return next;
    });
  }, []);

  const handleAuthenticatorDigitPaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, OTP_DIGITS_LENGTH);
    if (!pasted) return;

    const nextDigits = [...Array(OTP_DIGITS_LENGTH)].map((_, index) => pasted[index] || '');
    setAuthenticatorDigits(nextDigits);
  }, []);

  const handleAuthenticatorDigitKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (event.key !== 'Backspace') return;

      setAuthenticatorDigits((previous) => {
        const next = [...previous];
        if (next[index]) {
          next[index] = '';
          return next;
        }

        if (index > 0) {
          next[index - 1] = '';
        }

        return next;
      });
    },
    [],
  );

  const authenticatorOtpValue = useMemo(() => authenticatorDigits.join(''), [authenticatorDigits]);

  const verifyAuthenticatorSetup = useCallback(async () => {
    if (!authenticatorChallengeId || !authenticatorSetupReady || isAuthenticatorWorking) return;

    setIsAuthenticatorWorking(true);
    try {
      const verifyFactor: OtpFactor = authenticatorStage === 'setup-email' ? 'EMAIL_OTP' : 'TOTP';
      const res = await authApi.verifyAuthChallenge({
        challengeId: authenticatorChallengeId,
        factor: verifyFactor,
        code: authenticatorOtpValue,
      });

      if (verifyFactor === 'EMAIL_OTP' && res.completed === false && res.purpose === 'SETUP_MFA') {
        setAuthenticatorOtpAuthUrl(res.otpAuthUrl);
        setAuthenticatorSecret(res.secret);
        localStorage.setItem(
          'mfa-setup-totp',
          JSON.stringify({ otpAuthUrl: res.otpAuthUrl, secret: res.secret }),
        );
        setAuthenticatorStage('setup-link');
        return;
      }

      if (res.completed === true && res.purpose === 'SETUP_MFA') {
        const nextAuthenticatorData = JSON.stringify({ addedOn: new Date().toISOString() });
        localStorage.setItem('authenticator-app-data', nextAuthenticatorData);
        localStorage.setItem('authenticator-app-verified', 'true');
        localStorage.removeItem('mfa-flow');
        localStorage.removeItem('mfa-setup-totp');
        setAuthenticatorData(nextAuthenticatorData);
        setEnabledMfa(true);
        showSuccess(
          t('security.verifyAuthenticator.toasts.enabledTitle', {
            defaultValue: 'Authenticator app enabled',
          }),
          t('security.verifyAuthenticator.toasts.enabledMessage', {
            defaultValue: 'MFA is now enabled.',
          }),
        );
        closeAuthenticatorSheet();
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
      setIsAuthenticatorWorking(false);
    }
  }, [
    authenticatorChallengeId,
    authenticatorOtpValue,
    authenticatorSetupReady,
    closeAuthenticatorSheet,
    isAuthenticatorWorking,
    authenticatorStage,
    showError,
    showSuccess,
    t,
  ]);

  const continueToAuthenticatorVerify = useCallback(() => {
    setAuthenticatorDigits(Array(OTP_DIGITS_LENGTH).fill(''));
    setAuthenticatorStage('setup-verify');
  }, []);

  useEffect(() => {
    if (!authenticatorOtpAuthUrl || authenticatorStage !== 'setup-link') {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const qrcode = await import('qrcode');
        const dataUrl = await qrcode.toDataURL(authenticatorOtpAuthUrl, { margin: 1, width: 220 });
        if (!cancelled) {
          setAuthenticatorQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setAuthenticatorQrDataUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticatorOtpAuthUrl, authenticatorStage]);

  const handleOpenRemoveAuthenticator = useCallback(() => {
    setDisableNoticeAccepted(false);
    setDisableSecurityRiskAccepted(false);
    setIsDisableConfirmOpen(true);
  }, []);

  const handleDisableAuthenticator = useCallback(async () => {
    if (isRemovingAuthenticator) return;

    setIsRemovingAuthenticator(true);
    try {
      const res = await requireLogin(() => authApi.createAuthChallenge({ purpose: 'DISABLE_MFA' }));
      if (!res) return;

      const requiredFactors = res.requiredFactors.filter(
        (factor): factor is OtpFactor => factor === 'TOTP' || factor === 'EMAIL_OTP',
      );
      setAuthenticatorVerifyFactor(requiredFactors.includes('EMAIL_OTP') ? 'EMAIL_OTP' : 'TOTP');
      setAuthenticatorChallengeId(res.challengeId);
      setAuthenticatorDigits(Array(OTP_DIGITS_LENGTH).fill(''));
      setAuthenticatorStage('disable-verify');
      setIsDisableConfirmOpen(false);
      localStorage.setItem(
        'mfa-flow',
        JSON.stringify({
          challengeId: res.challengeId,
          purpose: 'DISABLE_MFA',
          requiredFactors,
          expiresAt: Date.now() + 60_000,
        }),
      );
    } catch (error: unknown) {
      showError(
        t('security.authenticatorApp.errors.disableMfaFailedTitle', {
          defaultValue: 'Failed to disable MFA',
        }),
        localizeApiError(error, t),
      );
    } finally {
      setIsRemovingAuthenticator(false);
    }
  }, [isRemovingAuthenticator, requireLogin, showError, t]);

  const verifyDisableAuthenticator = useCallback(async () => {
    if (!authenticatorChallengeId || !authenticatorSetupReady || isAuthenticatorWorking) return;

    setIsAuthenticatorWorking(true);
    try {
      const res = await authApi.verifyAuthChallenge({
        challengeId: authenticatorChallengeId,
        factor: authenticatorVerifyFactor,
        code: authenticatorOtpValue,
      });

      if (res.completed === true && res.purpose === 'DISABLE_MFA') {
        localStorage.removeItem('authenticator-app-data');
        localStorage.removeItem('authenticator-app-verified');
        localStorage.removeItem('mfa-flow');
        localStorage.removeItem('mfa-setup-totp');
        setAuthenticatorData(null);
        setEnabledMfa(false);
        showSuccess(
          t('security.verifyAuthenticator.toasts.removedTitle', {
            defaultValue: 'Authenticator app removed',
          }),
          t('security.verifyAuthenticator.toasts.removedMessage', {
            defaultValue: 'MFA has been disabled.',
          }),
        );
        closeAuthenticatorSheet();
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
      setIsAuthenticatorWorking(false);
    }
  }, [
    authenticatorChallengeId,
    authenticatorOtpValue,
    authenticatorSetupReady,
    authenticatorVerifyFactor,
    closeAuthenticatorSheet,
    isAuthenticatorWorking,
    showError,
    showSuccess,
    t,
  ]);

  const handleDeleteAccount = useCallback(async () => {
    if (isDeletingAccount) return;

    setIsDeletingAccount(true);
    try {
      await authApi.deleteMe();
      tokenStorage.clearToken();
      logout();
      showSuccess(
        t('security.deleteAccount.successTitle', { defaultValue: 'Account deleted' }),
        t('security.deleteAccount.successMessage', {
          defaultValue: 'Your account has been deleted successfully.',
        }),
      );
      closeDeleteSheet();
      router.replace('/login');
    } catch (error: unknown) {
      showError(
        t('security.deleteAccount.failedTitle', { defaultValue: 'Delete account failed' }),
        localizeApiError(error, t),
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }, [closeDeleteSheet, isDeletingAccount, logout, router, showError, showSuccess, t]);

  const canConfirmDisable =
    disableNoticeAccepted && disableSecurityRiskAccepted && !isRemovingAuthenticator;

  if (!isAuthHydrated) {
    return <SplashLogo size={300} />;
  }

  return (
    <div className="bg-background min-h-[calc(100dvh-72px)] overflow-auto px-6 py-6">
      <ChangePasswordSheet
        open={isChangePasswordSheetOpen}
        hasPassword={hasPassword}
        t={t}
        changeOldPassword={changeOldPassword}
        setChangeOldPassword={setChangeOldPassword}
        changeNewPassword={changeNewPassword}
        setChangeNewPassword={setChangeNewPassword}
        changeConfirmPassword={changeConfirmPassword}
        setChangeConfirmPassword={setChangeConfirmPassword}
        showOldPassword={showOldPassword}
        setShowOldPassword={setShowOldPassword}
        showNewPassword={showNewPassword}
        setShowNewPassword={setShowNewPassword}
        showConfirmPassword={showConfirmPassword}
        setShowConfirmPassword={setShowConfirmPassword}
        passwordValidation={passwordValidation}
        isChangingPassword={isChangingPassword}
        closeChangePasswordSheet={closeChangePasswordSheet}
        handleSavePassword={handleSavePassword}
        setIsChangePasswordSheetOpen={setIsChangePasswordSheetOpen}
      />

      <AuthenticatorSheet
        open={isAuthenticatorSheetOpen}
        onOpenChange={(open) =>
          open ? setIsAuthenticatorSheetOpen(true) : closeAuthenticatorSheet()
        }
        closeAuthenticatorSheet={closeAuthenticatorSheet}
        t={t}
        enabledMfa={enabledMfa}
        authenticatorStage={authenticatorStage}
        setAuthenticatorStage={setAuthenticatorStage}
        setIsDisableConfirmOpen={setIsDisableConfirmOpen}
        authenticatorAddedOn={authenticatorAddedOn}
        handleOpenRemoveAuthenticator={handleOpenRemoveAuthenticator}
        authenticatorDigits={authenticatorDigits}
        handleAuthenticatorDigitChange={handleAuthenticatorDigitChange}
        handleAuthenticatorDigitPaste={handleAuthenticatorDigitPaste}
        handleAuthenticatorDigitKeyDown={handleAuthenticatorDigitKeyDown}
        authenticatorSetupReady={authenticatorSetupReady}
        isAuthenticatorWorking={isAuthenticatorWorking}
        verifyDisableAuthenticator={verifyDisableAuthenticator}
        verifyAuthenticatorSetup={verifyAuthenticatorSetup}
        authenticatorQrDataUrl={authenticatorQrDataUrl}
        authenticatorSecret={authenticatorSecret}
        isCopyingSecret={isCopyingSecret}
        onCopySecret={async () => {
          if (!authenticatorSecret) return;
          setIsCopyingSecret(true);
          try {
            await navigator.clipboard.writeText(authenticatorSecret);
            showSuccess(
              t('security.linkAuthenticator.toasts.copiedTitle', { defaultValue: 'Copied' }),
              t('security.linkAuthenticator.toasts.copiedMessage', {
                defaultValue: 'Secret key copied to clipboard.',
              }),
            );
          } finally {
            setIsCopyingSecret(false);
          }
        }}
        continueToAuthenticatorVerify={continueToAuthenticatorVerify}
        startAuthenticatorSetup={startAuthenticatorSetup}
      />

      <DisableAuthenticatorConfirmSheet
        open={isDisableConfirmOpen}
        setIsDisableConfirmOpen={setIsDisableConfirmOpen}
        disableNoticeAccepted={disableNoticeAccepted}
        setDisableNoticeAccepted={setDisableNoticeAccepted}
        disableSecurityRiskAccepted={disableSecurityRiskAccepted}
        setDisableSecurityRiskAccepted={setDisableSecurityRiskAccepted}
        isRemovingAuthenticator={isRemovingAuthenticator}
        canConfirmDisable={canConfirmDisable}
        handleDisableAuthenticator={handleDisableAuthenticator}
        t={t}
      />

      <DeleteAccountSheet
        open={isDeleteSheetOpen}
        setIsDeleteSheetOpen={setIsDeleteSheetOpen}
        closeDeleteSheet={closeDeleteSheet}
        isDeletingAccount={isDeletingAccount}
        handleDeleteAccount={handleDeleteAccount}
        t={t}
      />

      <div className="grid gap-6">
        <section className="border-border bg-background rounded-2xl border p-6">
          <div className="flex items-center gap-4">
            <CircleProgress value={securityScore} max={2} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-body-large-semibold text-foreground font-semibold">
                  {t('security.securityLevel')}
                </span>
                <span
                  className={cn(
                    'text-body-large-semibold font-semibold',
                    isStrongSecurity ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {isReady
                    ? isStrongSecurity
                      ? t('security.levelStrong')
                      : t('security.levelWeak')
                    : '...'}
                </span>
              </div>
              <span className="text-body-small-regular text-muted-foreground text-sm">
                {isStrongSecurity
                  ? t('security.levelDescriptionStrong')
                  : t('security.levelDescriptionWeak')}
              </span>
            </div>
          </div>
        </section>

        <section className="border-border bg-background rounded-2xl border p-6">
          <div className="mb-2">
            <span className="text-body-small-regular text-muted-foreground text-sm">
              {t('security.verificationOptions')}
            </span>
          </div>

          <div className="flex flex-col">
            <SecurityActionRow
              label={
                hasPassword === false
                  ? t('security.setPasswordLabel', { defaultValue: 'Set password' })
                  : t('security.changePasswordLabel')
              }
              onClick={handleOpenChangePassword}
              rightElement={
                !isReady ? (
                  <span className="text-body-large-semibold text-muted-foreground">...</span>
                ) : undefined
              }
            />
            <SecurityActionRow
              label={t('security.authenticatorAppLabel')}
              onClick={handleOpenAuthenticator}
              rightElement={
                enabledMfa === true ? (
                  <span className="text-body-large-semibold text-primary-500">
                    {t('security.authenticatorStatusOn')}
                  </span>
                ) : undefined
              }
            />
          </div>

          <div className="mt-8 mb-2">
            <span className="text-body-small-regular text-muted-foreground text-sm">
              {t('security.advancedSettings')}
            </span>
          </div>

          <div className="flex flex-col">
            <SecurityActionRow
              destructive
              label={t('security.deleteAccountLabel')}
              onClick={handleOpenDelete}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
