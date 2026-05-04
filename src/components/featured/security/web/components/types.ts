export type OtpFactor = 'TOTP' | 'EMAIL_OTP';

export type AuthenticatorStage =
  | 'overview'
  | 'setup-email'
  | 'setup-link'
  | 'setup-verify'
  | 'disable-verify';

export type PasswordValidation = {
  hasMinLength: boolean;
  hasSpecialChar: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasDigit: boolean;
  passwordsMatch: boolean;
  isDifferentFromOld: boolean;
};
