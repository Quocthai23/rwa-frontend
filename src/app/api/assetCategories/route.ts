import { ASSETS_ENDPOINTS } from '@/constants/api';
import { apiClient } from '@/services/apiClient';
import type { Category } from '@/types/assets';

export async function GET() {
  const categories = await apiClient.get<Category[]>(ASSETS_ENDPOINTS.CATEGORIES, undefined, {
    skipAuth: true,
  });

  return Response.json({ data: categories });
}
