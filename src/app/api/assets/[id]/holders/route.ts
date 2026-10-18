import type { NextRequest } from 'next/server';

import { ASSETS_ENDPOINTS } from '@/constants/api';
import { apiClient } from '@/services/apiClient';
import type { AssetHolderDistribution } from '@/services/assetsService';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) return Response.json({ message: 'Missing asset id' }, { status: 400 });
  const data = await apiClient.get<AssetHolderDistribution>(
    ASSETS_ENDPOINTS.HOLDERS(id),
    undefined,
    {
      skipAuth: true,
    },
  );
  return Response.json(data);
}
