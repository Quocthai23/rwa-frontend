const LEGACY_ACCESS_TOKEN_KEY = 'access_token_bridge';
let socketTokenRequest: Promise<string | undefined> | undefined;
export const getSocketAccessToken = (): Promise<string | undefined> => {
  if (!socketTokenRequest) {
    socketTokenRequest = fetch('/api/auth/socket-token', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => response.ok ? (await response.json()).data?.accessToken as string | undefined : undefined)
      .catch(() => undefined)
      .finally(() => { socketTokenRequest = undefined; });
  }
  return socketTokenRequest;
};

const clearCookie = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

/**
 * Helper function to get cookie value by name
 */
const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.indexOf(nameEQ) === 0) {
      const cookieValue = cookie.substring(nameEQ.length);
      return cookieValue ? decodeURIComponent(cookieValue) : undefined;
    }
  }

  return undefined;
};

export const tokenStorage = {
  clearToken: (): void => {
    if (typeof document === 'undefined') return;

    // Clear only the JS compatibility bridge token.
    // Do not clear server-managed auth cookies here.
    clearCookie(LEGACY_ACCESS_TOKEN_KEY);
  },

  getAccessToken: (): string | undefined => {
    return getCookie(LEGACY_ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | undefined => {
    // Deprecated: refresh token is server-managed httpOnly cookie and is not readable in JS.
    return undefined;
  },

  removeAccessToken: (): void => {
    if (typeof document === 'undefined') return;
    clearCookie(LEGACY_ACCESS_TOKEN_KEY);
  },

  removeRefreshToken: (): void => {
    // Deprecated: refresh token should be removed by /api/auth/logout at server boundary.
  },

  setAccessToken: (token: string): void => {
    if (typeof document === 'undefined') return;

    // Keep the JS-readable compatibility bridge isolated from the server-managed auth cookie.
    clearCookie(LEGACY_ACCESS_TOKEN_KEY);
    document.cookie = `${LEGACY_ACCESS_TOKEN_KEY}=${token}; max-age=${365 * 24 * 60 * 60}; path=/; SameSite=Strict`;
  },

  setRefreshToken: (token: string): void => {
    // Deprecated: refresh token should never be stored in JS-accessible cookies.
    void token;
  },
};

