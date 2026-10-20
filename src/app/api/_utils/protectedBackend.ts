import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from './auth';
import { apiClient } from '@/services/apiClient';

// Use the server cookie and the shared refresh flow for protected BFF requests.
export function protectedBackend(request: NextRequest, endpoint: string, body?: Record<string, never> | Record<string, string | number | boolean>) {
  return withServerTokenRefresh(request, (token) => {
    const options = { headers: { Authorization: `Bearer ${token}` }, skipAuth: true };
    return body === undefined
      ? apiClient.get(endpoint, undefined, options)
      : apiClient.post(endpoint, body, options);
  }, 'backend-request-failed');
}
