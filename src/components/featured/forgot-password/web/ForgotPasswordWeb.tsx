'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
// layout-only web form — no Image/Link needed here
import { Check, ChevronLeft, Eye, EyeOff, X } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { authApi } from '@/services/auth';
import { useToast } from '@/hook/useToast';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import AuthLeftPanel from '@/components/featured/shared/AuthLeftPanel';

enum Step {
  Input = 'input',
  VerifyOtp = 'verify-otp',
  CreateNewPassword = 'create-new-password',
}

const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-\.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function ForgotPasswordWeb() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(Step.Input);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // OTP
  const [otp, setOtp] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Reset password
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const { showError, showSuccess } = useToast();
  const router = useRouter();

  const trimmedEmail = email.trim();
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
      if (!response.exists) {
        showError(
          t('auth.register.registerFailedTitle', { defaultValue: 'Failed' }),
          t('auth.register.emailNotFound', { defaultValue: 'Email not found' }),
        );
        return;
      }
      const send = await authApi.sendOTP(trimmedEmail, 'reset_password');
      if (send.success) {
        setEmail(trimmedEmail);
        setStep(Step.VerifyOtp);
        setCanResend(false);
        setResendCountdown(60);
      } else {
        showError(
          t('security.resetPassword.otpSendFailedTitle'),
          t('security.resetPassword.otpSendFailedMessage'),
        );
      }
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : t('security.resetPassword.otpSendFailedMessage');
      showError(t('security.resetPassword.otpSendFailedTitle'), message);
    } finally {
      setIsEmailLoading(false);
    }
  };

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
          t('auth.register.registerFailedTitle', { defaultValue: 'Failed' }),
          t('auth.register.enterSixDigits', { defaultValue: 'Please enter 6 digits' }),
        );
        return;
      }
      if (!email) {
        showError(
          t('auth.register.registerFailedTitle', { defaultValue: 'Failed' }),
          t('auth.register.emailMissing', { defaultValue: 'Email is missing' }),
        );
        setStep(Step.Input);
        return;
      }
      setIsOtpLoading(true);
      try {
        const res = await authApi.verifyOTP(email, otp, 'reset_password');
        setResetToken(res.token);
        setStep(Step.CreateNewPassword);
      } catch (err) {
        const message =
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : t('security.resetPassword.invalidCodeMessage');
        showError(t('auth.register.registerFailedTitle', { defaultValue: 'Failed' }), message);
      } finally {
        setIsOtpLoading(false);
      }
    },
    [otp, email, showError, t],
  );

  const handleResendCode = async () => {
    if (!canResend || !email) return;
    try {
      setCanResend(false);
      setResendCountdown(60);
      const response = await authApi.sendOTP(email, 'reset_password');
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
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : t('security.resetPassword.otpSendFailedMessage');
      showError(t('security.resetPassword.otpSendFailedTitle'), message);
      setCanResend(true);
      setResendCountdown(0);
    }
  };

  const { hasMinLength, hasSpecialChar, hasUpperCase, hasLowerCase, hasDigit, passwordsMatch } =
    useMemo(() => {
      const min = password.length >= 8;
      const special = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password);
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

  const isPasswordValid =
    hasMinLength && hasSpecialChar && hasUpperCase && hasLowerCase && hasDigit && passwordsMatch;

  const handleResetPassword = async () => {
    if (!email || !resetToken) {
      setStep(Step.Input);
      return;
    }
    if (!isPasswordValid) return;
    setIsResetLoading(true);
    try {
      const response = await authApi.resetPassword(resetToken, password);
      if (response.success) {
        showSuccess(
          t('security.resetPassword.resetSuccessTitle', { defaultValue: 'Reset successful' }),
          t('security.resetPassword.resetSuccessMessage', {
            defaultValue: 'Password reset successfully.',
          }),
        );
        // redirect to login after successful reset
        router.replace('/login');
      }
    } catch (err) {
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : t('auth.register.registerFailedMessage');
      showError(t('auth.register.registerFailedTitle', { defaultValue: 'Failed' }), message);
    } finally {
      setIsResetLoading(false);
    }
  };

  const StepHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="white-contained"
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="size-8 p-0"
        >
          <ChevronLeft className="size-5 text-neutral-600" />
        </Button>
        <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
        <Button
          variant="white-contained"
          onClick={() => window.history.back()}
          aria-label="Close"
          className="size-8 p-0"
        >
          <X className="size-5 text-neutral-600" />
        </Button>
      </div>
      <div className="mb-6 h-px w-full bg-neutral-200" />
    </>
  );

  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center p-4 md:p-0">
      <div className="dark:bg-card flex w-full max-w-[1000px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl md:h-[680px] dark:border-neutral-800">
        <AuthLeftPanel />

        <div className="dark:bg-card dark:text-foreground flex flex-1 flex-col overflow-y-auto bg-white p-8 md:p-12">
          {step === Step.Input && (
            <form className="flex flex-col gap-5" onSubmit={handleEmailContinue}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="dark:text-foreground text-2xl font-bold text-neutral-900">
                  {t('security.resetPassword.title', { defaultValue: 'Reset Password' })}
                </h2>
                <Button
                  variant="white-contained"
                  onClick={() => window.history.back()}
                  aria-label="Close"
                  title="Close"
                  className="size-6 p-0"
                >
                  <X className="size-6 text-neutral-600" />
                </Button>
              </div>

              <div className="mb-8 h-px w-full bg-neutral-200 dark:bg-neutral-800" />

              <div className="flex flex-col gap-2">
                <label className="dark:text-foreground text-sm font-semibold text-neutral-700">
                  {t('auth.login.emailAddress')}
                </label>
                <Input
                  autoComplete="email"
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={email}
                  className="focus:border-primary-500 h-12 border-neutral-200 dark:border-neutral-800"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  onBlur={() => validateEmail(email)}
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

          {step === Step.VerifyOtp && (
            <form className="flex flex-1 flex-col" onSubmit={handleOtpSubmit}>
              <StepHeader
                title={t('auth.register.verifyOtpTitle', {
                  defaultValue: 'Enter verification code',
                })}
                onBack={() => setStep(Step.Input)}
              />

              <div className="mb-6 flex flex-col items-center gap-1">
                <p className="text-sm text-neutral-500">
                  {t('auth.register.otpSentTo', { defaultValue: "We've sent the code to" })}
                </p>
                <p className="text-sm font-semibold text-neutral-900">{email}</p>
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
                    className="focus:border-primary-500 focus:ring-primary-500/20 h-12 w-12 rounded border border-neutral-200 bg-white text-center text-lg font-semibold text-neutral-900 focus:ring-2 focus:outline-none"
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

          {step === Step.CreateNewPassword && (
            <div className="flex flex-1 flex-col">
              <StepHeader
                title={t('security.resetPassword.title', { defaultValue: 'Reset Password' })}
                onBack={() => setStep(Step.VerifyOtp)}
              />

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-700">New password</label>
                  <div className="relative">
                    <Input
                      placeholder={t('security.resetPassword.newPasswordPlaceholder', {
                        defaultValue: 'New password',
                      })}
                      autoCapitalize="none"
                      autoCorrect="off"
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

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-neutral-700">Confirm password</label>
                  <div className="relative">
                    <Input
                      placeholder={t('security.resetPassword.confirmPasswordPlaceholder', {
                        defaultValue: 'Confirm password',
                      })}
                      autoCapitalize="none"
                      autoCorrect="off"
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
                      {t('security.resetPassword.passwordsNotMatch', {
                        defaultValue: 'Passwords do not match',
                      })}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-neutral-600">
                    {t('security.resetPassword.passwordMustContain', {
                      defaultValue: 'Your password must contain:',
                    })}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${hasMinLength ? 'bg-green-500' : 'bg-neutral-200'}`}
                      >
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      <span
                        className={`text-xs ${hasMinLength ? 'text-green-600' : 'text-neutral-400'}`}
                      >
                        {t('auth.register.passwordRuleMinLength', {
                          defaultValue: '8+ characters',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${hasSpecialChar ? 'bg-green-500' : 'bg-neutral-200'}`}
                      >
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      <span
                        className={`text-xs ${hasSpecialChar ? 'text-green-600' : 'text-neutral-400'}`}
                      >
                        {t('auth.register.passwordRuleSpecial', {
                          defaultValue: 'Special character',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${hasDigit ? 'bg-green-500' : 'bg-neutral-200'}`}
                      >
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      <span
                        className={`text-xs ${hasDigit ? 'text-green-600' : 'text-neutral-400'}`}
                      >
                        {t('auth.register.passwordRuleNumber', { defaultValue: 'Number' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${hasUpperCase ? 'bg-green-500' : 'bg-neutral-200'}`}
                      >
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      <span
                        className={`text-xs ${hasUpperCase ? 'text-green-600' : 'text-neutral-400'}`}
                      >
                        {t('auth.register.passwordRuleUppercase', {
                          defaultValue: 'Uppercase letter',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${hasLowerCase ? 'bg-green-500' : 'bg-neutral-200'}`}
                      >
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      <span
                        className={`text-xs ${hasLowerCase ? 'text-green-600' : 'text-neutral-400'}`}
                      >
                        {t('auth.register.passwordRuleLowercase', {
                          defaultValue: 'Lowercase letter',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${passwordsMatch ? 'bg-green-500' : 'bg-neutral-200'}`}
                      >
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      <span
                        className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-neutral-400'}`}
                      >
                        {t('auth.register.passwordRuleMatch', { defaultValue: 'Passwords match' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="primary-contained"
                className="shadow-primary-500/20 mt-auto w-full py-3 text-base font-semibold shadow-lg"
                disabled={!isPasswordValid}
                onClick={handleResetPassword}
              >
                {isResetLoading
                  ? t('auth.login.loading', { defaultValue: 'Loading...' })
                  : t('security.resetPassword.reset', { defaultValue: 'Reset' })}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
