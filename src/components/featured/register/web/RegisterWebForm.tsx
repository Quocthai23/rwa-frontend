'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AuthLeftPanel from '@/components/featured/shared/AuthLeftPanel';
import { Check, ChevronLeft, Eye, EyeOff, X } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { authApi } from '@/services/auth';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { useAuthStore } from '@/store/authStore';
import { RegisterStep, useRegisterFlow } from '../shared/useRegisterFlow';

const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-\.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

function PasswordRule({ isValid, text }: { isValid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${isValid ? 'bg-green-500' : 'bg-neutral-200'}`}
      >
        <Check size={10} color="white" strokeWidth={3} />
      </div>
      <span className={`text-xs ${isValid ? 'text-green-600' : 'text-neutral-400'}`}>{text}</span>
    </div>
  );
}

// left panel moved to shared AuthLeftPanel

export default function RegisterWebForm() {
  const {
    t,
    router,
    step,
    setStep,
    data,
    setData,
    skipInitialResendCooldown,
    isGoogleSubmitting,
    handleGoogleSignUp,
    missingDataHandler,
    expireRegisterSession,
    setTokenIssuedAt,
  } = useRegisterFlow();
  const hasHydratedAuth = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (!hasHydratedAuth || !isAuthenticated) return;
    router.replace('/market');
  }, [hasHydratedAuth, isAuthenticated, router]);
  const shouldHideForAuthenticatedUser = hasHydratedAuth && isAuthenticated;

  // ── Email step ──────────────────────────────────────────────────────────────
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const trimmedEmail = data.email.trim();
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

  const handleEmailContinue = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    if (!isEmailValid) {
      validateEmail(trimmedEmail);
      return;
    }
    setIsEmailLoading(true);
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
        setData((prev) => ({ ...prev, email: trimmedEmail }));
        setStep(RegisterStep.VerifyOtp);
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
      setIsEmailLoading(false);
    }
  };

  // ── OTP step ────────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step !== RegisterStep.VerifyOtp) return;
    if (skipInitialResendCooldown) {
      setCanResend(true);
      setResendCountdown(0);
      return;
    }
    setOtp('');
    setCanResend(false);
    setResendCountdown(60);
  }, [step, skipInitialResendCooldown]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      if (!canResend) setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setResendCountdown((p) => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown, canResend]);

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
    otpInputsRef.current[index + 1]?.focus();
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 6);
    if (!pasted) return;
    setOtp(pasted);
    otpInputsRef.current[Math.min(pasted.length, 6) - 1]?.focus();
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
    otpInputsRef.current[prevIndex]?.focus();
  };

  const handleOtpSubmit = useCallback(
    async (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (otp.length !== 6) {
        showError(
          t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
          t('auth.register.enterSixDigits', { defaultValue: 'Please enter 6 digits' }),
        );
        return;
      }
      if (!data.email) {
        missingDataHandler();
        return;
      }
      setIsOtpLoading(true);
      try {
        const response = await authApi.verifyOTP(data.email, otp, 'register');
        setData((prev) => ({ ...prev, token: response.token }));
        setTokenIssuedAt(Date.now());
        setStep(RegisterStep.CreatePassword);
      } catch (error) {
        const message =
          typeof error === 'string'
            ? error
            : error instanceof Error
              ? error.message
              : t('security.resetPassword.invalidCodeMessage');
        showError(
          t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
          message,
        );
      } finally {
        setIsOtpLoading(false);
      }
    },
    [otp, data.email, missingDataHandler, setData, setStep, setTokenIssuedAt, showError, t],
  );

  const handleResendCode = async () => {
    if (!canResend || !data.email) return;
    try {
      setCanResend(false);
      setResendCountdown(60);
      const response = await authApi.sendOTP(data.email, 'register');
      if (response.success) {
        showSuccess(t('transfer.form.otpSentTitle'), t('transfer.form.otpSentMessage'));
      } else {
        showError(
          t('security.resetPassword.otpSendFailedTitle'),
          t('security.resetPassword.otpSendFailedMessage'),
        );
        setCanResend(true);
        setResendCountdown(0);
      }
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : t('security.resetPassword.otpSendFailedMessage');
      showError(t('security.resetPassword.otpSendFailedTitle'), message);
      setCanResend(true);
      setResendCountdown(0);
    }
  };

  // ── Password step ───────────────────────────────────────────────────────────
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (step !== RegisterStep.CreatePassword) return;
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [step]);

  const { hasMinLength, hasSpecialChar, hasUpperCase, hasLowerCase, hasDigit, passwordsMatch } =
    useMemo(
      () => ({
        hasMinLength: password.length >= 8,
        hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password),
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasDigit: /\d/.test(password),
        passwordsMatch: password.length > 0 && password === confirmPassword,
      }),
      [password, confirmPassword],
    );

  const isPasswordValid =
    hasMinLength && hasSpecialChar && hasUpperCase && hasLowerCase && hasDigit && passwordsMatch;

  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const getErrorCode = (error: unknown): string | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;
    if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
      return (error as { code: string }).code.toLowerCase();
    }
    const nestedErrors = (error as { errors?: unknown }).errors;
    if (
      typeof nestedErrors === 'object' &&
      nestedErrors !== null &&
      'code' in nestedErrors &&
      typeof (nestedErrors as { code?: unknown }).code === 'string'
    ) {
      return (nestedErrors as { code: string }).code.toLowerCase();
    }
    return undefined;
  };

  const isRegisterTokenInvalid = (error: unknown): boolean => {
    const code = getErrorCode(error);
    if (!code) return false;
    if (
      code === 'token-expired' ||
      code === 'otp-not-found' ||
      code === 'invalid-otp' ||
      code === 'user-not-found' ||
      code === 'unauthorized' ||
      code === 'invalid-token'
    ) {
      return true;
    }
    const message =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : ((error as { message?: unknown })?.message as string | undefined) || '';
    const normalized = message.toLowerCase();
    return (
      (normalized.includes('expired') && normalized.includes('token')) ||
      (normalized.includes('otp') && normalized.includes('expired')) ||
      (normalized.includes('otp') && normalized.includes('not found')) ||
      normalized.includes('invalid otp') ||
      normalized.includes('invalid register token')
    );
  };

  const handleRegister = async () => {
    if (!data.email || !data.token) {
      missingDataHandler();
      return;
    }
    if (!isPasswordValid) return;
    
    setIsRegisterLoading(true);
    try {
      const response = await authApi.register({
        password: password,
        registerToken: data.token,
      });
      if (response.user) {
        showSuccess(
          t('auth.register.registerSuccessTitle', { defaultValue: 'Registration successful' }),
          t('auth.register.registerSuccessMessage', {
            defaultValue: 'You have been registered successfully.',
          }),
        );
        router.replace(`/login?email=${encodeURIComponent(response.user.email || data.email)}`);
      } else {
        showError(
          t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
          t('auth.register.missingUserData', {
            defaultValue: 'Registration response is missing user data. Please try again.',
          }),
        );
        setIsRegisterLoading(false);
      }
    } catch (error) {
      if (getErrorCode(error) === 'otp-not-found' || isRegisterTokenInvalid(error)) {
        expireRegisterSession(localizeApiError(error, t));
        return;
      }
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' });
      showError(
        t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
        message ||
          t('auth.register.registerFailedMessage', {
            defaultValue: 'Registration failed. Please try again.',
          }),
      );
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // ── Shared header for inner steps ───────────────────────────────────────────
  const StepHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="white-contained"
          type="button"
          onClick={onBack}
          aria-label={t('auth.register.back', { defaultValue: 'Back' })}
          className="size-8 p-0"
        >
          <ChevronLeft className="size-5 text-neutral-600" />
        </Button>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
        <Button
          variant="white-contained"
          onClick={() => router.back()}
          aria-label={t('common.close')}
          className="size-8 p-0"
        >
          <X className="size-5 text-neutral-600" />
        </Button>
      </div>
      <div className="mb-6 h-px w-full bg-neutral-200" />
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  if (shouldHideForAuthenticatedUser) return null;

  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center p-4 md:p-0">
      <div className="dark:bg-card flex w-full max-w-[1000px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl md:h-[680px] dark:border-neutral-800">
        <AuthLeftPanel />

        <div className="dark:bg-card dark:text-foreground flex flex-1 flex-col overflow-y-auto bg-white p-8 md:p-12">
          {/* ── Start step ──────────────────────────────────────────────── */}
          {step === RegisterStep.Start && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="dark:text-foreground text-2xl font-bold text-neutral-900">
                  {t('auth.register.title')}
                </h2>
                <Button
                  variant="white-contained"
                  onClick={() => router.push('/market')}
                  aria-label={t('common.close')}
                  className="size-6 p-0"
                >
                  <X className="size-6 text-neutral-600" />
                </Button>
              </div>

              <div className="mb-8 h-px w-full bg-neutral-200 dark:bg-neutral-800" />

              <div className="flex flex-col gap-4">
                <Button
                  type="button"
                  variant="neutral-outline"
                  className="dark:bg-card flex h-12 w-full items-center justify-center gap-3 border-neutral-200 dark:border-neutral-800"
                  onClick={() => void handleGoogleSignUp()}
                  disabled={isGoogleSubmitting}
                >
                  <Image src="/assets/images/google.png" alt="Google" width={20} height={20} />
                  <span className="dark:hover:text-primary-500 text-sm font-semibold text-neutral-700 dark:text-white">
                    {isGoogleSubmitting
                      ? t('auth.login.loading')
                      : t('auth.register.signUpWithGoogle')}
                  </span>
                </Button>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
                  <span className="dark:text-muted-foreground text-xs font-bold tracking-wider text-neutral-500 uppercase">
                    {t('auth.register.or')}
                  </span>
                  <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
                </div>

                <Button
                  type="button"
                  variant="neutral-outline"
                  className="dark:bg-card h-12 w-full border-neutral-200 dark:border-neutral-800"
                  onClick={() => setStep(RegisterStep.Input)}
                >
                  <span className="dark:hover:text-primary-500 text-sm font-semibold text-neutral-700 dark:text-white">
                    {t('auth.register.signUpWithEmail')}
                  </span>
                </Button>
              </div>

              <p className="dark:text-muted-foreground mt-auto pt-8 text-center text-sm text-neutral-500">
                {t('auth.register.alreadyHaveAccount', {
                  defaultValue: 'Already have an account?',
                })}{' '}
                <Link href="/login" className="text-primary-500 font-semibold hover:underline">
                  {t('auth.register.login')}
                </Link>
              </p>
            </>
          )}

          {/* ── Email input step ─────────────────────────────────────────── */}
          {step === RegisterStep.Input && (
            <form className="flex flex-1 flex-col" onSubmit={handleEmailContinue}>
              <StepHeader
                title={t('auth.register.title')}
                onBack={() => setStep(RegisterStep.Start)}
              />

              <div className="flex flex-col gap-2">
                <label className="dark:text-foreground text-sm font-semibold text-neutral-700">
                  {t('auth.login.emailAddress')}
                </label>
                <Input
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={data.email}
                  className="focus:border-primary-500 h-12 border-neutral-200 dark:border-neutral-800"
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, email: e.target.value }));
                    if (emailError) setEmailError('');
                  }}
                  onBlur={() => validateEmail(data.email)}
                />
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>

              <Button
                variant="primary-contained"
                type="submit"
                className="shadow-primary-500/20 mt-auto w-full py-3 text-base font-semibold shadow-lg"
                disabled={isEmailLoading || !isEmailValid}
              >
                {isEmailLoading ? t('auth.login.loading') : t('transfer.verifyOtp.continue')}
              </Button>
            </form>
          )}

          {/* ── OTP verification step ────────────────────────────────────── */}
          {step === RegisterStep.VerifyOtp && (
            <form className="flex flex-1 flex-col" onSubmit={handleOtpSubmit}>
              <StepHeader
                title={t('auth.register.verifyOtpTitle', { defaultValue: 'Verify your email' })}
                onBack={() => setStep(RegisterStep.Input)}
              />

              <div className="mb-6 flex flex-col items-center gap-1">
                <p className="text-sm text-neutral-500">
                  {t('auth.register.otpSentTo', { defaultValue: "We've sent the code to" })}
                </p>
                <p className="text-sm font-semibold text-neutral-900">{data.email}</p>
              </div>

              <div className="flex justify-center gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputsRef.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[index] || ''}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onPaste={handleOtpPaste}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    aria-label={t('auth.register.otpAriaLabel', {
                      index: index + 1,
                      defaultValue: `OTP digit ${index + 1}`,
                    })}
                    className="dark:bg-card dark:text-foreground focus:border-primary-500 focus:ring-primary-500/20 h-12 w-12 rounded border border-neutral-200 bg-white text-center text-lg font-semibold text-neutral-900 focus:ring-2 focus:outline-none"
                  />
                ))}
              </div>

              <button
                type="button"
                className="mt-5 flex w-full items-center justify-center"
                disabled={!canResend}
                onClick={handleResendCode}
              >
                {canResend ? (
                  <span className="text-primary-500 text-sm font-medium">
                    {t('auth.register.resendCode', { defaultValue: 'Resend code' })}
                  </span>
                ) : (
                  <span className="text-sm text-neutral-500">
                    {t('auth.register.resendCodeIn', { defaultValue: 'Resend code in' })}{' '}
                    <span className="text-primary-500 font-medium">
                      {formatCountdown(resendCountdown)}
                    </span>
                  </span>
                )}
              </button>

              <Button
                variant="primary-contained"
                type="submit"
                className="shadow-primary-500/20 mt-auto w-full py-3 text-base font-semibold shadow-lg"
                disabled={isOtpLoading || otp.length !== 6}
              >
                {isOtpLoading ? t('auth.login.loading') : t('transfer.verifyOtp.continue')}
              </Button>
            </form>
          )}

          {/* ── Create password step ─────────────────────────────────────── */}
          {step === RegisterStep.CreatePassword && (
            <div className="flex flex-1 flex-col">
              <StepHeader
                title={t('auth.register.createPasswordTitle', { defaultValue: 'Password' })}
                onBack={() => setStep(RegisterStep.VerifyOtp)}
              />

              <div className="flex flex-col gap-5">
                {/* Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-700">
                    {t('auth.login.password')}
                  </label>
                  <div className="relative">
                    <Input
                      placeholder={t('auth.login.passwordPlaceholder')}
                      autoComplete="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      className="h-12 border-neutral-200 pr-12"
                      onChange={(e) => setPassword(e.target.value)}
                      rightAccessory={
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showPassword ? (
                            <Eye className="size-5" />
                          ) : (
                            <EyeOff className="size-5" />
                          )}
                        </button>
                      }
                    />
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-700">
                    {t('security.resetPassword.confirmPassword')}
                  </label>
                  <div className="relative">
                    <Input
                      placeholder={t('security.resetPassword.confirmPasswordPlaceholder')}
                      autoComplete="new-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      className="h-12 border-neutral-200 pr-12"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      rightAccessory={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showConfirmPassword ? (
                            <Eye className="size-5" />
                          ) : (
                            <EyeOff className="size-5" />
                          )}
                        </button>
                      }
                    />
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-red-500">
                      {t('security.resetPassword.passwordsNotMatch')}
                    </p>
                  )}
                </div>

                {/* Password rules */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-neutral-600">
                    {t('security.resetPassword.passwordMustContain', {
                      defaultValue: 'Your password must contain:',
                    })}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <PasswordRule
                      isValid={hasMinLength}
                      text={t('auth.register.passwordRuleMinLength', {
                        defaultValue: '8+ characters',
                      })}
                    />
                    <PasswordRule
                      isValid={hasSpecialChar}
                      text={t('auth.register.passwordRuleSpecial', {
                        defaultValue: 'Special character',
                      })}
                    />
                    <PasswordRule
                      isValid={hasDigit}
                      text={t('auth.register.passwordRuleNumber', { defaultValue: 'Number' })}
                    />
                    <PasswordRule
                      isValid={hasUpperCase}
                      text={t('auth.register.passwordRuleUppercase', {
                        defaultValue: 'Uppercase letter',
                      })}
                    />
                    <PasswordRule
                      isValid={hasLowerCase}
                      text={t('auth.register.passwordRuleLowercase', {
                        defaultValue: 'Lowercase letter',
                      })}
                    />
                    <PasswordRule
                      isValid={passwordsMatch}
                      text={t('auth.register.passwordRuleMatch', {
                        defaultValue: 'Passwords match',
                      })}
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="primary-contained"
                className="shadow-primary-500/20 mt-auto w-full py-3 text-base font-semibold shadow-lg"
                disabled={!isPasswordValid || isRegisterLoading}
                onClick={handleRegister}
              >
                {isRegisterLoading ? t('auth.login.loading') : t('transfer.verifyOtp.continue')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
