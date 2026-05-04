import { NextRequest } from 'next/server';
import { type UpdateProfilePayload } from '@/types/auth';
import { authApi } from '@/services/auth';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as UpdateProfilePayload;

  return withServerTokenRefresh(
    request,
    (token) => authApi.updateProfile(body, token),
    'user-update-failed',
  );
}
