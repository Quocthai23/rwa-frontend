import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { userApi } from '@/services/userService';

const DEFAULT_TAKE = 5;
const MAX_TAKE = 30;
const DEFAULT_SKIP = 0;

const parseTake = (value: null | string): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TAKE;
  }

  return Math.min(MAX_TAKE, Math.max(1, parsed));
};

const parseSkip = (value: null | string): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SKIP;
  }

  return Math.max(0, parsed);
};

export async function GET(request: NextRequest) {
  const take = parseTake(request.nextUrl.searchParams.get('take'));
  const skip = parseSkip(request.nextUrl.searchParams.get('skip'));

  return withServerTokenRefresh(
    request,
    (token) => userApi.listSuggestions({ skip, take }, token),
    'user-suggestions-fetch-failed',
  );
}
