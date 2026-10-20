import {
  clearAuthCookies,
  successResponse,
  getAccessTokenFromRequest,
} from '@/app/api/_utils/auth';
import { API_BASE_URL } from '@/constants/env';
import { apiClient } from '@/services/apiClient';

export async function POST(request: Request) {
  const accessTokenHeader = getAccessTokenFromRequest(request);

  if (accessTokenHeader) {
    const backendUrl = API_BASE_URL || 'http://localhost:3001';
    try {
      await apiClient.postWithResponse('auth/logout', undefined, {
        baseUrl: backendUrl,
        headers: {
          Authorization: `Bearer ${accessTokenHeader}`,
          ...(request.headers
            .get('cookie')
            ?.split(';')
            .find((value) => value.trim().startsWith('refresh_token='))
            ? {
                Cookie: request.headers
                  .get('cookie')!
                  .split(';')
                  .find((value) => value.trim().startsWith('refresh_token='))!
                  .trim(),
              }
            : {}),
        },
        skipAuth: true,
      });
    } catch {
      // Ignore backend logout errors, we still want to clear local cookies
    }
  }

  const response = successResponse({ success: true }, 200);

  clearAuthCookies(response);

  return response;
}
