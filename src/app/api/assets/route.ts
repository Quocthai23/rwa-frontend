import { ASSETS_ENDPOINTS } from '@/constants/api';
import type { Asset } from '@/types';
import { apiClient } from '@/services/apiClient';
import { getAccessTokenFromRequest } from '@/app/api/_utils/auth';

export async function GET(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);

  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

  const assets = await apiClient.get<Asset[]>(ASSETS_ENDPOINTS.LIST, undefined, {
    headers,
  });

  return Response.json({ data: assets });
}
