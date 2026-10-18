import { NextRequest, NextResponse } from 'next/server';

import { ApiError } from '@/services/apiClient';
import { authApi } from '@/services/auth';
import { COOKIE_SECURE } from '@/constants/env';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type ErrorPayload = {
  code?: string;
  details?: unknown;
  message: string;
};

const DEFAULT_ERROR_MESSAGE = 'Unexpected error';

const getCookieFromHeader = (cookieHeader: string, name: string): string | undefined => {
  const prefix = `${name}=`;

  for (const cookie of cookieHeader.split(';').map((value) => value.trim())) {
    if (!cookie.startsWith(prefix)) {
      continue;
    }

    const value = cookie.slice(prefix.length);
    return value ? decodeURIComponent(value) : undefined;
  }

  return undefined;
};

export const getAccessTokenFromRequest = (request: Request): string | undefined => {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }

  const cookieHeader = request.headers.get('cookie') ?? '';

  const accessToken = getCookieFromHeader(cookieHeader, ACCESS_COOKIE);
  if (accessToken) {
    return accessToken;
  }

  return undefined;
};

export const getRefreshTokenFromRequest = (request: Request): string | undefined => {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookieRefreshToken = getCookieFromHeader(cookieHeader, REFRESH_COOKIE);

  return cookieRefreshToken;
};

export const successResponse = <T>(data: T, status = 200): NextResponse => {
  return NextResponse.json({ data, success: true }, { status });
};

export const errorResponse = (
  message: string,
  status: number,
  options?: { code?: string; details?: unknown },
): NextResponse => {
  const errors: ErrorPayload = {
    message,
  };

  if (options?.code) {
    errors.code = options.code;
  }

  if (options?.details !== undefined) {
    errors.details = options.details;
  }

  return NextResponse.json({ errors, success: false }, { status });
};

export const readStringField = (payload: unknown, field: string): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[field];
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
};

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return DEFAULT_ERROR_MESSAGE;
};

export const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const directCode = (error as { code?: unknown }).code;
  if (typeof directCode === 'string' && directCode.trim()) {
    return directCode;
  }

  const nestedErrorCode = (error as { error?: { code?: unknown } }).error?.code;
  if (typeof nestedErrorCode === 'string' && nestedErrorCode.trim()) {
    return nestedErrorCode;
  }

  const nestedErrorsCode = (error as { errors?: { code?: unknown } }).errors?.code;
  if (typeof nestedErrorsCode === 'string' && nestedErrorsCode.trim()) {
    return nestedErrorsCode;
  }

  return undefined;
};

export const getErrorStatus = (error: unknown, fallback = 500): number => {
  if (error && typeof error === 'object') {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status <= 599) {
      return status;
    }
  }

  return fallback;
};

export const upstreamErrorResponse = (
  error: unknown,
  fallbackCode: string,
  fallbackStatus = 500,
): NextResponse => {
  console.error('[upstreamErrorResponse] Caught error:', error);
  let errorDetails = String(error);
  if (error instanceof Error && (error as any).cause) {
    errorDetails += ` (cause: ${String((error as any).cause)})`;
  }
  return errorResponse(getErrorMessage(error), getErrorStatus(error, fallbackStatus), {
    code: getErrorCode(error) || fallbackCode,
    details: errorDetails,
  });
};

export const setAuthCookies = (
  response: NextResponse,
  tokens: { accessToken: string; refreshToken?: string },
): void => {
  response.cookies.set({
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    name: ACCESS_COOKIE,
    path: '/',
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    value: tokens.accessToken,
  });
  if (tokens.refreshToken) {
    response.cookies.set({
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      name: REFRESH_COOKIE,
      path: '/',
      sameSite: 'lax',
      secure: COOKIE_SECURE,
      value: tokens.refreshToken,
    });
  }
};

export const clearAuthCookies = (response: NextResponse): void => {
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: ACCESS_COOKIE,
    path: '/',
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    value: '',
  });

  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: REFRESH_COOKIE,
    path: '/',
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    value: '',
  });
};

const isTokenExpiredError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return false;
  return error.code === 'token-expired';
};

const isTokenExpiredPayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (getErrorCode(payload) === 'token-expired') {
    return true;
  }

  const nestedData = (payload as { data?: unknown }).data;
  return getErrorCode(nestedData) === 'token-expired';
};

export const withServerTokenRefresh = async <T>(
  request: NextRequest,
  serviceCall: (accessToken: string) => Promise<T>,
  fallbackCode: string,
  buildResponse: (data: T) => NextResponse = (data) => NextResponse.json({ data }, { status: 200 }),
): Promise<NextResponse> => {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return errorResponse('Unauthorized', 401, { code: 'missing-token' });
  }

  try {
    const data = await serviceCall(accessToken);

    if (isTokenExpiredPayload(data)) {
      throw new ApiError('token-expired', 'Token expired', 401);
    }

    return buildResponse(data);
  } catch (error) {
    if (!isTokenExpiredError(error)) {
      return upstreamErrorResponse(error, fallbackCode);
    }

    const refreshToken = getRefreshTokenFromRequest(request);

    if (!refreshToken) {
      const response = errorResponse('Session expired', 401, { code: 'session-expired' });
      clearAuthCookies(response);
      return response;
    }

    let newTokens: { accessToken?: string; refreshToken?: string };
    try {
      newTokens = await authApi.refreshToken({ refreshToken });
    } catch {
      const response = errorResponse('Session expired', 401, { code: 'refresh-failed' });
      clearAuthCookies(response);
      return response;
    }

    if (!newTokens.accessToken) {
      const response = errorResponse('Session expired', 401, { code: 'refresh-failed' });
      clearAuthCookies(response);
      return response;
    }

    try {
      const data = await serviceCall(newTokens.accessToken);
      const response = buildResponse(data);
      setAuthCookies(response, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      });
      return response;
    } catch (retryError) {
      return upstreamErrorResponse(retryError, fallbackCode);
    }
  }
};
