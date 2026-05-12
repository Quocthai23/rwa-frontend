/**
 * News API Endpoints
 */
export const NEWS_ENDPOINTS = {
  AGGREGATE: '/api/news/aggregate',
  BLOOMBERG: '/api/news/bloomberg',
  LIST: 'home/news',
  REUTERS: '/api/news/reuters',
  TOPICS: 'home/news/topics',
  TRADING_ECONOMICS: '/api/news/tradingeconomics',
  VN_WALLSTREET: '/api/news/external',
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
} as const;

export const PAYMENT_ENDPOINTS = {
  DEPOSIT_DEMO: '/payment/deposit-demo',
  CREATE_WALLET: '/payment/create-wallet',
  WITHDRAW: '/payment/withdraw',
  HISTORY: '/payment/history',
  TRANSFER: '/payment/transfer',
} as const;

/**
 * Positions Endpoints
 */
export const POSITIONS_ENDPOINTS = {
  BULK_CLOSE: '/positions/bulk-close',
  LIST: '/positions',
  STATS: '/positions/stats',
  CLOSE: (id: string) => `/positions/${id}/close`,
  UPDATE: (id: string) => `/positions/${id}`,
} as const;

export const ORDERS_ENDPOINTS = {
  CREATE: '/orders',
  LIST: '/orders',
} as const;

export const ACCOUNTS_ENDPOINTS = {
  BALANCE: '/accounts/balance',
  CREATE: '/accounts',
  DELETE: (id: string) => `/accounts/${id}`,
  LIST: '/accounts',
  TYPES: '/accounts/types',
  UPDATE: (id: string) => `/accounts/${id}`,
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
  AR: '🇦🇷',
  AU: '🇦🇺',
  BR: '🇧🇷',
  CA: '🇨🇦',
  CH: '🇨🇭',
  CN: '🇨🇳',
  DE: '🇩🇪',
  DK: '🇩🇰',
  ES: '🇪🇸',
  EU: '🇪🇺',
  FR: '🇫🇷',
  GB: '🇬🇧',
  HK: '🇭🇰',
  IN: '🇮🇳',
  IT: '🇮🇹',
  JP: '🇯🇵',
  KR: '🇰🇷',
  MX: '🇲🇽',
  NO: '🇳🇴',
  NZ: '🇳🇿',
  PL: '🇵🇱',
  RU: '🇷🇺',
  SE: '🇸🇪',
  SG: '🇸🇬',
  TR: '🇹🇷',
  US: '🇺🇸',
  ZA: '🇿🇦',
};
export const COMMISSION_ENDPOINTS = {
  REBATE_STATS: '/commission/rebate-stats',
  REBATE_DETAILS: '/commission/rebate-details',
  COMMISSION_STATS: '/commission/stats',
  CLAIM: '/commission/claim',
} as const;

/**
 * News source config for emoji display
 */
export const NEWS_SOURCE_ICONS: Record<string, string> = {
  bloomberg: '📊',
  crypto: '₿',
  default: '📰',
  reuters: '📈',
  tradingeconomics: '💹',
  vnwallstreet: '🇻🇳',
};
