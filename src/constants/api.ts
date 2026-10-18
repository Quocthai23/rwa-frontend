/**
 * News API Endpoints
 */
export const NEWS_ENDPOINTS = {
  LIST: '/news',
  SOURCES: '/news/sources',
} as const;

/**
 * Notification API Endpoints
 */
export const NOTIFICATION_ENDPOINTS = {
  LIST: '/notifications',
  UNREAD: '/notifications/unread-count',
  READ_ALL: '/notifications/read-all',
  READ: (id: string) => `/notifications/${id}/read`,
} as const;

/**
 * Market Trending Endpoints
 */
export const MARKET_ENDPOINTS = {
  TRENDING: 'home/trending',
} as const;

/**
 * Market Data Endpoints
 */
export const MARKET_DATA_ENDPOINTS = {
  CANDLES: '/market-data/candles',
  REFERENCE_PRICE: '/market-data/reference-price',
  VALUATION_HISTORY: '/market-data/valuation/history',
} as const;

/**
 * Economic Calendar Endpoints
 */
export const CALENDAR_ENDPOINTS = {
  EVENTS: '/api/economic-calendar',
  LIST: 'home/calendar',
} as const;

/**
 * Trading Assets Endpoints
 */
export const ASSETS_ENDPOINTS = {
  CATEGORIES: '/asset-categories',
  LIST: '/assets',
  MARKET_DATA: (id: string) => `/assets/${id}/market-data`,
  HOLDERS: (id: string) => `/assets/${id}/holders`,
  ONBOARDING: (id: string) => `/assets/${id}/onboarding/submit`,
} as const;

export const ASSET_MANAGEMENT_ENDPOINTS = {
  STATUS: (id: string) => `/asset-management/${id}/status`,
  BUYOUT_PROPOSALS: (id: string) => `/asset-management/${id}/dao/buyout-proposals`,
  BUYOUT_QUOTE: (id: string, durationMonths: number, premiumPercent?: number) =>
    `/asset-management/${id}/dao/buyout-quote?durationMonths=${durationMonths}${
      premiumPercent === undefined ? '' : `&premiumPercent=${premiumPercent}`
    }`,
} as const;

export const PAYMENT_ENDPOINTS = {
  CREATE_WALLET: '/payment/create-wallet',
  WITHDRAW: '/payment/withdraw',
  HISTORY: '/payment/history',
  TRANSFER: '/payment/transfer',
} as const;

export const ORDERS_ENDPOINTS = {
  CREATE: '/orders',
  LIST: '/orders',
  BULK_CANCEL: '/orders/bulk-cancel',
  UPDATE: (id: string) => `/orders/${id}`,
} as const;

export const ACCOUNTS_ENDPOINTS = {
  BALANCE: '/accounts/balance',
  CREATE: '/accounts',
  DELETE: (id: string) => `/accounts/${id}`,
  LIST: '/accounts',
  TYPES: '/accounts/types',
  UPDATE: (id: string) => `/accounts/${id}`,
} as const;

export const PORTFOLIO_ENDPOINTS = {
  OVERVIEW: '/user/portfolio/overview',
  ITEMS: '/user/portfolio/items',
  HISTORY: '/user/portfolio/history',
} as const;

/**
 * Cache timing configuration (in milliseconds)
 */
export const CACHE_TIMES = {
  CALENDAR: 10 * 60 * 1000, // 10 minutes for calendar
  NEWS: 5 * 60 * 1000, // 5 minutes for news
  TRENDING: 3 * 60 * 1000, // 3 minutes for trending
} as const;

/**
 * API delay configuration for development (in milliseconds)
 */
export const API_DELAY_MS = {
  LONG: 400,
  MEDIUM: 300,
  SHORT: 200,
  VERY_LONG: 500,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1,
} as const;

/**
 * Country code to flag emoji mapping
 */
export const COUNTRY_FLAGS: Record<string, string> = {
  AR: 'đŸ‡¦đŸ‡·',
  AU: 'đŸ‡¦đŸ‡º',
  BR: 'đŸ‡§đŸ‡·',
  CA: 'đŸ‡¨đŸ‡¦',
  CH: 'đŸ‡¨đŸ‡­',
  CN: 'đŸ‡¨đŸ‡³',
  DE: 'đŸ‡©đŸ‡ª',
  DK: 'đŸ‡©đŸ‡°',
  ES: 'đŸ‡ªđŸ‡¸',
  EU: 'đŸ‡ªđŸ‡º',
  FR: 'đŸ‡«đŸ‡·',
  GB: 'đŸ‡¬đŸ‡§',
  HK: 'đŸ‡­đŸ‡°',
  IN: 'đŸ‡®đŸ‡³',
  IT: 'đŸ‡®đŸ‡¹',
  JP: 'đŸ‡¯đŸ‡µ',
  KR: 'đŸ‡°đŸ‡·',
  MX: 'đŸ‡²đŸ‡½',
  NO: 'đŸ‡³đŸ‡´',
  NZ: 'đŸ‡³đŸ‡¿',
  PL: 'đŸ‡µđŸ‡±',
  RU: 'đŸ‡·đŸ‡º',
  SE: 'đŸ‡¸đŸ‡ª',
  SG: 'đŸ‡¸đŸ‡¬',
  TR: 'đŸ‡¹đŸ‡·',
  US: 'đŸ‡ºđŸ‡¸',
  ZA: 'đŸ‡¿đŸ‡¦',
};
/**
 * Dividend API Endpoints
 */
export const DIVIDEND_ENDPOINTS = {
  CLAIMABLE: '/dividends/claimable',
  CLAIM: (distributionId: string) => `/dividends/claim/${distributionId}`,
  PROOF: (distributionId: string) => `/dividends/claim-proof/${distributionId}`,
} as const;

export const KYC_ENDPOINTS = {
  SUBMIT: '/kyc/submit',
  ME: '/kyc/me',
} as const;

/**
 * News source config for emoji display
 */
export const NEWS_SOURCE_ICONS: Record<string, string> = {
  bloomberg: 'đŸ“',
  crypto: 'â‚¿',
  default: 'đŸ“°',
  reuters: 'đŸ“ˆ',
  tradingeconomics: 'đŸ’¹',
  vnwallstreet: 'đŸ‡»đŸ‡³',
};
