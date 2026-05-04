import type { TFunction } from 'i18next';

const API_ERROR_CODE_KEY_MAP: Record<string, string> = {
  'account-forbidden': 'apiErrors.accountForbidden',
  'email-already-exists': 'apiErrors.emailAlreadyExists',
  'insufficient-balance': 'apiErrors.insufficientBalance',
  'invalid-email': 'apiErrors.invalidEmail',
  'invalid-credentials': 'apiErrors.invalidCredentials',
  'invalid-otp': 'apiErrors.invalidOtp',
  'invalid-password': 'apiErrors.invalidPassword',
  'password-attempt-limit-exceeded': 'apiErrors.passwordAttemptLimitExceeded',
  'rate-limit-exceeded': 'apiErrors.rateLimitExceeded',
  'token-expired': 'apiErrors.tokenExpired',
  unauthorized: 'apiErrors.unauthorized',
  'user-not-found': 'apiErrors.userNotFound',
  'post-not-found': 'apiErrors.postNotFound',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractCode(error: unknown): string | undefined {
  if (!isObject(error)) return undefined;

  if (typeof error.code === 'string' && error.code.trim()) {
    return error.code;
  }

  if (isObject(error.error) && typeof error.error.code === 'string' && error.error.code.trim()) {
    return error.error.code;
  }

  if (isObject(error.errors) && typeof error.errors.code === 'string' && error.errors.code.trim()) {
    return error.errors.code;
  }

  return undefined;
}

function extractMessage(error: unknown): string | undefined {
  if (!error) return undefined;

  if (typeof error === 'string') {
    return error.trim() || undefined;
  }

  if (Array.isArray(error)) {
    const messages = error
      .map((item) => extractMessage(item))
      .filter((item): item is string => Boolean(item));
    return messages.length > 0 ? messages.join(', ') : undefined;
  }

  if (!isObject(error)) return undefined;

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (typeof error.summary === 'string' && error.summary.trim()) {
    return error.summary;
  }

  if (typeof error.errors === 'string' && error.errors.trim()) {
    return error.errors;
  }

  if (
    isObject(error.errors) &&
    typeof error.errors.message === 'string' &&
    error.errors.message.trim()
  ) {
    return error.errors.message;
  }

  if (
    isObject(error.error) &&
    typeof error.error.message === 'string' &&
    error.error.message.trim()
  ) {
    return error.error.message;
  }

  return undefined;
}

export function localizeApiError(
  error: unknown,
  t: TFunction,
  fallbackKey = 'apiErrors.generic',
): string {
  const code = extractCode(error)?.toLowerCase();
  console.error('API error code extracted:', code);
  if (code) {
    const mappedKey = API_ERROR_CODE_KEY_MAP[code];
    if (mappedKey) {
      return t(mappedKey);
    }
  }

  return extractMessage(error) || t(fallbackKey);
}
