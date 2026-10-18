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
  'refresh-failed': 'apiErrors.unauthorized',
  'session-expired': 'apiErrors.unauthorized',
  'missing-refresh-token': 'apiErrors.unauthorized',
  'missing-token': 'apiErrors.unauthorized',
  'token-expired': 'apiErrors.tokenExpired',
  unauthorized: 'apiErrors.unauthorized',
  'user-not-found': 'apiErrors.userNotFound',
  'post-not-found': 'apiErrors.postNotFound',
  'payment-create-wallet-failed': 'apiErrors.paymentCreateWalletFailed',
  'order-create-failed': 'trade.errors.failedCreateOrder',
  'buyout-buyer-cannot-trade-until-program-is-completed': 'trade.buyoutTrading.buyerLockedShort',
  'buyout-buyer-cannot-trade-while-proposal-is-live': 'trade.buyoutTrading.buyerLockedShort',
  'asset-is-not-active': 'apiErrors.assetInactive',
  'asset-already-has-active-tenant': 'apiErrors.assetAlreadyRented',
  'rental-application-already-exists': 'apiErrors.rentalApplicationExists',
  'desired-start-date-must-be-in-the-future': 'apiErrors.rentalStartDateFuture',
  'only-token-holders-can-create-proposals': 'apiErrors.proposalTokenHolderOnly',
  'rental-applications-operator-only': 'apiErrors.rentalApplicationsOperatorOnly',
  'rental-application-not-found': 'apiErrors.rentalApplicationNotFound',
  'rental-application-already-reviewed': 'apiErrors.rentalApplicationAlreadyReviewed',
  'monthly-rent-must-be-positive': 'apiErrors.monthlyRentPositive',
  'rental-deposit-cannot-be-negative': 'apiErrors.rentalDepositNonNegative',
  'active-rental-contract-not-found': 'apiErrors.activeRentalContractNotFound',
  'only-current-tenant-can-pay-rent': 'apiErrors.rentalPaymentTenantOnly',
  'rental-period-before-contract-start': 'apiErrors.rentalPeriodBeforeStart',
  'rental-period-after-contract-end': 'apiErrors.rentalPeriodAfterEnd',
  'future-rental-period-cannot-be-paid': 'apiErrors.rentalFuturePeriod',
  'rental-period-already-paid': 'apiErrors.rentalPeriodAlreadyPaid',
  'rental-income-funding-account-is-missing': 'apiErrors.rentalFundingMissing',
};

const API_ERROR_MESSAGE_RULES: Array<{ pattern: RegExp; key: string }> = [
  {
    pattern: /rental-period-already-paid/i,
    key: 'apiErrors.rentalPeriodAlreadyPaid',
  },
  {
    pattern: /only-current-tenant-can-pay-rent/i,
    key: 'apiErrors.rentalPaymentTenantOnly',
  },
  {
    pattern: /rental-application-not-found/i,
    key: 'apiErrors.rentalApplicationNotFound',
  },
  {
    pattern: /rental-application-already-reviewed/i,
    key: 'apiErrors.rentalApplicationAlreadyReviewed',
  },
  {
    pattern: /monthly-rent-must-be-positive/i,
    key: 'apiErrors.monthlyRentPositive',
  },
  {
    pattern: /rental-deposit-cannot-be-negative/i,
    key: 'apiErrors.rentalDepositNonNegative',
  },
  {
    pattern: /asset-already-has-active-tenant/i,
    key: 'apiErrors.assetAlreadyRented',
  },
  {
    pattern: /rental-application-already-exists/i,
    key: 'apiErrors.rentalApplicationExists',
  },
  {
    pattern: /desired-start-date-must-be-in-the-future/i,
    key: 'apiErrors.rentalStartDateFuture',
  },
  {
    pattern: /only-token-holders-can-create-proposals/i,
    key: 'apiErrors.proposalTokenHolderOnly',
  },
  {
    pattern: /not eligible to create a buyout|must currently hold at least|held continuously/i,
    key: 'apiErrors.buyoutNotEligible',
  },
  {
    pattern:
      /active or approved buyout proposal already exists|live buyout proposal already exists/i,
    key: 'apiErrors.buyoutProposalExists',
  },
  {
    pattern:
      /session expired|token expired|jwt expired|unauthori[sz]ed|missing (access |refresh )?token/i,
    key: 'apiErrors.unauthorized',
  },
  {
    pattern: /insufficient (available )?(balance|funds)|not enough (balance|funds)/i,
    key: 'trade.errors.insufficientAvailableBalance',
  },
  {
    pattern:
      /asset is not available for trading|market (is )?closed|trading (is )?(paused|closed)/i,
    key: 'trade.errors.marketClosedMessage',
  },
  {
    pattern: /buyout-buyer-cannot-trade/i,
    key: 'trade.buyoutTrading.buyerLockedShort',
  },
  {
    pattern: /quantity must|invalid quantity|volume must|amount must be greater than zero/i,
    key: 'trade.validation.invalidVolume',
  },
  {
    pattern:
      /price must|limit price|circuit breaker band|reference price|market order protection price/i,
    key: 'trade.errors.failedCreateOrder',
  },
  {
    pattern: /order value|unsupported order type|order is no longer available|order changed/i,
    key: 'trade.errors.failedCreateOrder',
  },
];

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
  if (code) {
    const mappedKey = API_ERROR_CODE_KEY_MAP[code];
    if (mappedKey) {
      return t(mappedKey);
    }
  }

  const message = extractMessage(error);
  if (message) {
    const maxOrderValueMatch = message.match(/order value must not exceed\s+([\d.,]+)\s+VNDT/i);
    if (maxOrderValueMatch) {
      const numericValue = Number(maxOrderValueMatch[1].replace(/,/g, ''));
      const value = Number.isFinite(numericValue)
        ? numericValue.toLocaleString()
        : maxOrderValueMatch[1];
      return t('trade.errors.maxOrderValueExceeded', { value });
    }
    const rule = API_ERROR_MESSAGE_RULES.find(({ pattern }) => pattern.test(message));
    if (rule) return t(rule.key);
  }

  // Backend messages are implementation details and may be in a different
  // language. Never expose an unmapped raw message to end users.
  return t(fallbackKey);
}
