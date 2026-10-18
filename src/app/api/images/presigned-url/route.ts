import { NextRequest } from 'next/server';

import { apiClient } from '@/services/apiClient';
import type { PresignedUrlResponse } from '@/services/imageService';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const files = searchParams.get('files') ?? '1';

  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.get<PresignedUrlResponse>(`images/presigned-url?files=${files}`, undefined, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    'images-presigned-url-failed',
  );
}

