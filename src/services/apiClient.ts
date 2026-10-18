import ky, {
  HTTPError,
  type KyInstance,
  type Options as KyOptions,
  type SearchParamsOption,
} from 'ky';

import { API_BASE_URL, SHOULD_LOG_REQUESTS } from '../constants/env';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse } from '../store/types';

import { tokenStorage } from './tokenStorage';

const API_BASE = API_BASE_URL as string;
const NO_CONTENT_STATUS = 204;
const isBrowser = typeof window !== 'undefined';
const isDevelopment = process.env.NODE_ENV === 'development';
const shouldLogRequests = SHOULD_LOG_REQUESTS;
const LOGIN_PATH = '/login';
const FORCE_LOGOUT_CODES = new Set(['auth-refresh-failed', 'refresh-failed', 'session-expired']);

let isForceLogoutInProgress = false;

type JsonObject = {
  [key: string]: JsonObject | JsonValue | JsonValue[];
};

type JsonValue = boolean | null | number | string;

type QueryParameters = Record<string, JsonValue | JsonValue[] | undefined>;

type RequestOptions = {
  baseUrl?: string;
  skipAuth?: boolean;
} & Omit<KyOptions, 'body' | 'json' | 'method' | 'searchParams'>;

type TokenPayload = {
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    access_token?: string;
    refresh_token?: string;
  };
};

type PaginatedResponse<T> = ApiResponse<T> & {
  nextCursor?: string;
};

type ErrorResponseBody = {
  code?: string;
  error?: { code?: string; message?: string };
  errors?: { code?: string; message?: string } | string;
  message?: string;
};

const getNestedErrorsObject = (
  errors?: ErrorResponseBody['errors'],
): { code?: string; message?: string } | undefined => {
  if (!errors || typeof errors === 'string') {
    return undefined;
  }

  return errors;
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const forceLogoutAndRedirectToLogin = () => {
  if (!isBrowser || isForceLogoutInProgress) {
    return;
  }

  isForceLogoutInProgress = true;
  tokenStorage.clearToken();
  useAuthStore.getState().logout();

  // A protected request can finish after navigation to the login page. Do not
  // call logout and replace /login with itself, otherwise every late 401 causes
  // another full page load and creates an infinite refresh loop.
  if (
    window.location.pathname === LOGIN_PATH ||
    window.location.pathname.startsWith(`${LOGIN_PATH}/`)
  ) {
    isForceLogoutInProgress = false;
    return;
  }

  void fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
    .catch(() => undefined)
    .finally(() => {
      window.location.replace(LOGIN_PATH);
    });
};

const toReadableError = async (error: unknown): Promise<never> => {
  if (isDevelopment) {
    console.log('error', error);
  }
  if (!(error instanceof HTTPError)) {
    throw error;
  }

  const status = error.response.status;
  let message = error.message;
  let code = 'http-error';

  try {
    const body = (await error.response.clone().json()) as ErrorResponseBody;
    const nestedErrors = getNestedErrorsObject(body.errors);

    if (typeof body?.message === 'string' && body.message.trim()) {
      message = body.message;
    } else if (body?.error && typeof body.error.message === 'string' && body.error.message.trim()) {
      message = body.error.message;
    } else if (typeof body?.errors === 'string' && body.errors.trim()) {
      message = body.errors;
    } else if (typeof nestedErrors?.message === 'string' && nestedErrors.message.trim()) {
      message = nestedErrors.message;
    } else {
      message = 'Something went wrong. Please try again later.';
    }

    code = body?.code || body?.error?.code || nestedErrors?.code || code;
  } catch {
    // Keep ky default error message if response body is not JSON.
  }

  if (FORCE_LOGOUT_CODES.has(code)) {
    forceLogoutAndRedirectToLogin();
  }

  if (message.includes('Request failed with status code') || code === 'http-error') {
    message = 'Something went wrong. Please try again later.';
  }

  throw new ApiError(code, message, status);
};

const toSearchParametersOption = (parameters?: QueryParameters): SearchParamsOption | undefined => {
  if (!parameters) return undefined;

  const cleanParameters: Record<string, string> = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanParameters[key] = String(value);
    }
  }

  return cleanParameters;
};

const toHeaders = (headers?: KyOptions['headers']): Record<string, string> => {
  if (!headers) return {};

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }

  return output;
};

const extractTokens = (payload: unknown): { accessToken?: string; refreshToken?: string } => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const data = payload as TokenPayload;

  return {
    accessToken:
      data.accessToken || data.access_token || data.data?.accessToken || data.data?.access_token,
    refreshToken:
      data.refreshToken ||
      data.refresh_token ||
      data.data?.refreshToken ||
      data.data?.refresh_token,
  };
};

const toAbsoluteUrl = (endpoint: string, baseUrl?: string): string => {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const prefix = baseUrl || API_BASE;
  const normalizedPrefix = prefix.replace(/\/+$/, '');
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');

  return `${normalizedPrefix}/${normalizedEndpoint}`;
};

const sanitizeForLogs = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogs(item));
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(input)) {
      output[key] = sanitizeForLogs(nestedValue);
    }
    return output;
  }

  return value;
};

const toLoggableBody = (body: FormData | JsonObject | undefined): unknown => {
  if (!body) {
    return null;
  }

  if (body instanceof FormData) {
    return Array.from(body.entries()).map(([key, value]) => {
      return {
        key,
        value: typeof value === 'string' ? value : `[File:${value.name}]`,
      };
    });
  }

  return sanitizeForLogs(body);
};

class TokenManager {
  getAccessToken() {
    return tokenStorage.getAccessToken();
  }

  setAccessToken(token: string) {
    tokenStorage.setAccessToken(token);
  }

  setRefreshToken(token?: string) {
    // Intentionally no-op: refresh token should be stored as httpOnly cookie (server-managed),
    // not in JS-accessible cookies.
    void token;
  }

  clearToken() {
    tokenStorage.clearToken();
  }
}

class RefreshManager {
  private refreshPromise: Promise<string | undefined> | null = null;

  constructor(private tokenManager: TokenManager) {}

  refresh(): Promise<string | undefined> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = extractTokens(await response.json());
      if (!data.accessToken) {
        throw new Error('Refresh failed');
      }

      this.tokenManager.setAccessToken(data.accessToken);
      this.tokenManager.setRefreshToken(data.refreshToken);
      return data.accessToken;
    })()
      .catch((error) => {
        this.tokenManager.clearToken();
        setTimeout(() => {
          useAuthStore.getState().logout();
        }, 0);
        throw error;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }
}

class RequestDeduplicator {
  private inflight = new Map<string, Promise<unknown>>();

  async dedupe<T>(key: string, executor: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const promise = executor().finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(key, promise);
    return promise;
  }
}

class AuthInterceptor {
  constructor(
    private tokenManager: TokenManager,
    private refreshManager: RefreshManager,
    private getClient: () => KyInstance,
  ) {}

  beforeRequest = (request: Request) => {
    const skipAuth = request.headers.get('x-skip-auth') === 'true';
    if (skipAuth) return;

    const token = this.tokenManager.getAccessToken();
    if (token && !request.headers.has('Authorization')) {
      request.headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }
  };

  afterResponse = async (request: Request, options: KyOptions, response: Response) => {
    if (!isBrowser || request.headers.get('x-skip-auth') === 'true') {
      return response;
    }

    let errorCode: string | undefined;

    try {
      const body = (await response.clone().json()) as ErrorResponseBody;
      errorCode = body?.code || body?.error?.code || getNestedErrorsObject(body.errors)?.code;
    } catch {
      // ignore non-JSON responses
    }
    const isTokenExpired = errorCode === 'token-expired';

    if (!isTokenExpired) {
      return response;
    }

    // Prevent infinite refresh loops (e.g. refresh succeeded but API still returns 401)
    if (request.headers.get('x-refresh-attempt') === 'true') {
      return response;
    }

    const accessToken = await this.refreshManager.refresh().catch(() => undefined);
    if (!accessToken) {
      return response;
    }

    const newHeaders = new Headers(request.headers);
    newHeaders.set(
      'Authorization',
      accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`,
    );
    newHeaders.set('x-refresh-attempt', 'true');

    // Re-dispatch using Ky with the original options to avoid issues with consumed body streams.
    return this.getClient()(request.url, { ...options, headers: newHeaders });
  };
}
class ApiClient {
  private tokenManager = new TokenManager();
  private refreshManager = new RefreshManager(this.tokenManager);
  private deduplicator = new RequestDeduplicator();
  private authInterceptor = new AuthInterceptor(
    this.tokenManager,
    this.refreshManager,
    () => this.rawClient,
  );
  private rawClient: KyInstance;
  private client: KyInstance;

  constructor() {
    const hooks = {
      beforeRequest: [this.authInterceptor.beforeRequest],
      afterResponse: [this.authInterceptor.afterResponse],
    };

    this.rawClient = ky.create({
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      hooks,
      retry: 0,
      timeout: 30000,
      fetch: async (input, init) => {
        if (typeof window !== 'undefined') {
          return fetch(input, init);
        }

        // Server-side: Bypass Next.js bug with fetch(Request)
        const req = input as Request;
        const bodyText = req.body ? await req.text() : undefined;

        const headers = new Headers();
        req.headers.forEach((value, key) => headers.set(key, value));

        return fetch(req.url, {
          method: req.method,
          headers,
          body: bodyText,
          credentials: req.credentials,
          cache: req.cache,
          redirect: req.redirect,
        });
      },
    });

    this.client = this.rawClient.extend({ prefixUrl: API_BASE });
  }

  private resolveClient(endpoint: string, baseUrl?: string) {
    if (baseUrl) {
      return this.rawClient.extend({ prefixUrl: baseUrl });
    }

    if (/^https?:\/\//i.test(endpoint)) {
      return this.rawClient;
    }

    return this.client;
  }

  private async parseResponse<T>(response: Response, haveTotal: boolean): Promise<T> {
    if (response.status === NO_CONTENT_STATUS) {
      return undefined as unknown as T;
    }

    const data: ApiResponse<T> = await response.json();

    if (data.success === false) {
      const errors = data.errors as { code?: string; message?: string } | string | undefined;
      const message =
        typeof errors === 'string' && errors.trim()
          ? errors
          : (errors as { message?: string } | undefined)?.message?.trim() || 'Unexpected error';
      const code =
        (errors as { code?: string } | undefined)?.code ||
        (data as { code?: string }).code ||
        'api-error';

      if (FORCE_LOGOUT_CODES.has(code)) {
        forceLogoutAndRedirectToLogin();
      }

      throw new ApiError(code, message, response.status);
    }

    if (data.data === undefined) {
      return data as unknown as T;
    }

    if (haveTotal) {
      const typed = data as PaginatedResponse<T>;

      if (
        typed.data &&
        typeof typed.data === 'object' &&
        'data' in typed.data &&
        'total' in typed.data
      ) {
        return typed.data as unknown as T;
      }

      return {
        data: typed.data,
        total: typed.total,
        nextCursor: typed.nextCursor,
      } as unknown as T;
    }

    return data.data;
  }

  private buildHeaders(options?: RequestOptions) {
    const headers = toHeaders(options?.headers);
    if (options?.skipAuth) {
      headers['x-skip-auth'] = 'true';
    }
    return headers;
  }

  private async request<T>(
    method: 'delete' | 'get' | 'patch' | 'post' | 'put',
    endpoint: string,
    options: {
      baseUrl?: string;
      json?: JsonObject;
      searchParams?: QueryParameters;
    } & RequestOptions = {},
    haveTotal = false,
  ): Promise<T> {
    const { baseUrl, searchParams, ...kyOptions } = options;
    const headers = this.buildHeaders(options);
    const client = this.resolveClient(endpoint, baseUrl);
    const usesPrefix = Boolean(baseUrl) || !/^https?:\/\//i.test(endpoint);
    const cleanEndpoint = usesPrefix && endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const absoluteUrl = toAbsoluteUrl(cleanEndpoint, baseUrl);

    const execute = async () => {
      if (shouldLogRequests) {
      }

      const response = await client(cleanEndpoint, {
        method,
        ...kyOptions,
        headers,
        searchParams: toSearchParametersOption(searchParams),
      }).catch(toReadableError);

      if (shouldLogRequests) {
      }

      return this.parseResponse<T>(response, haveTotal);
    };

    if (method === 'get' && isBrowser) {
      const dedupeKey = JSON.stringify({
        baseUrl: baseUrl ?? API_BASE,
        endpoint: cleanEndpoint,
        headers: {
          authorization: headers.Authorization ?? headers.authorization ?? null,
          skipAuth: headers['x-skip-auth'] ?? null,
        },
        searchParams: searchParams ?? {},
      });
      const key = `get:${dedupeKey}`;
      return this.deduplicator.dedupe(key, execute);
    }

    return execute();
  }

  private async requestWithResponse<T>(
    method: 'delete' | 'get' | 'patch' | 'post' | 'put',
    endpoint: string,
    options: {
      baseUrl?: string;
      json?: JsonObject;
      searchParams?: QueryParameters;
    } & RequestOptions = {},
    haveTotal = false,
  ): Promise<{ data: T; response: Response }> {
    const { baseUrl, searchParams, ...kyOptions } = options;
    const headers = this.buildHeaders(options);
    const client = this.resolveClient(endpoint, baseUrl);
    const usesPrefix = Boolean(baseUrl) || !/^https?:\/\//i.test(endpoint);
    const cleanEndpoint = usesPrefix && endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    const response = await client(cleanEndpoint, {
      method,
      ...kyOptions,
      headers,
      searchParams: toSearchParametersOption(searchParams),
    }).catch(toReadableError);

    // Clone response before consuming it if we want to read it again, but usually headers are fine to read after consumption
    const clonedResponse = response.clone();
    const data = await this.parseResponse<T>(response, haveTotal);

    return { data, response: clonedResponse };
  }

  delete<T>(endpoint: string, parameters?: QueryParameters, options?: RequestOptions) {
    return this.request<T>('delete', endpoint, { ...options, searchParams: parameters });
  }

  get<T>(
    endpoint: string,
    parameters?: QueryParameters,
    options?: RequestOptions,
    haveTotal = false,
  ) {
    return this.request<T>('get', endpoint, { ...options, searchParams: parameters }, haveTotal);
  }

  post<T>(endpoint: string, json?: JsonObject, options?: RequestOptions) {
    return this.request<T>('post', endpoint, { ...options, json });
  }

  postWithResponse<T>(endpoint: string, json?: JsonObject, options?: RequestOptions) {
    return this.requestWithResponse<T>('post', endpoint, { ...options, json });
  }

  put<T>(endpoint: string, json?: JsonObject, options?: RequestOptions) {
    return this.request<T>('put', endpoint, { ...options, json });
  }

  patch<T>(endpoint: string, json?: JsonObject, options?: RequestOptions) {
    return this.request<T>('patch', endpoint, { ...options, json });
  }

  async upload<T>(endpoint: string, body: FormData, options?: RequestOptions) {
    const { baseUrl, ...kyOptions } = options || {};
    const headers = this.buildHeaders(options);
    const client = this.resolveClient(endpoint, baseUrl);
    const usesPrefix = Boolean(baseUrl) || !/^https?:\/\//i.test(endpoint);
    const cleanEndpoint = usesPrefix && endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const absoluteUrl = toAbsoluteUrl(cleanEndpoint, baseUrl);

    if (shouldLogRequests) {
    }

    const response = await client(cleanEndpoint, {
      method: 'post',
      ...kyOptions,
      headers,
      body,
    }).catch(toReadableError);

    if (shouldLogRequests) {
    }

    return this.parseResponse<T>(response, false);
  }
}

export const apiClient = new ApiClient();

export const createPaginatedQueryKey = (baseKey: string[], parameters?: QueryParameters) => {
  return [...baseKey, ...(parameters ? [parameters] : [])];
};
