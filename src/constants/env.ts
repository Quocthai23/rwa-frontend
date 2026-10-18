/**
 * Environment Variables Configuration
 * Centralized configuration for all environment variables
 * This file exports all env variables used across the application
 */

/**
 * Node Environment
 */
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || NODE_ENV;
export const IS_APP_PRODUCTION = APP_ENV === 'production';

/**
 * API Configuration
 */
export const API_CHART_URL = process.env.NEXT_PUBLIC_API_CHART_URL;
export const SOCKET_CHART_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_SOCKET_CHART_URL;
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
/** @deprecated Prefer {@link SOCKET_CHART_URL}; order/trading realtime uses Socket.IO `/trading` on this origin. */
export const WS_ORDER_URL = process.env.NEXT_PUBLIC_WS_ORDER_URL;

/**
 * Authentication Configuration
 */
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Cookie/Security Configuration
 */
export const COOKIE_SECURE = IS_PRODUCTION;

/**
 * Logger Configuration
 */
export const SHOULD_LOG_REQUESTS = !IS_PRODUCTION;

/**
 * Validate required env variables
 */
const validateEnv = () => {
  const requiredEnvVars = ['NEXT_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_API_CHART_URL'];

  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
  const hasSocketUrl =
    Boolean(process.env.NEXT_PUBLIC_SOCKET_URL) ||
    Boolean(process.env.NEXT_PUBLIC_SOCKET_CHART_URL);
  if (!hasSocketUrl) {
    missingVars.push('NEXT_PUBLIC_SOCKET_URL');
  }

  if (missingVars.length > 0 && IS_PRODUCTION) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Validate on import
if (typeof window === 'undefined') {
  // Only validate on server side
  validateEnv();
}

