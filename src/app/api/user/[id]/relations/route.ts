import { NextRequest, NextResponse } from 'next/server';

import { errorResponse, withServerTokenRefresh } from '@/app/api/_utils/auth';
import { userApi, type UserRelationType } from '@/services/userService';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DEFAULT_SKIP = 0;
const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;
const VALID_RELATIONS: UserRelationType[] = ['block', 'followings', 'follower'];

const parsePositiveInt = (value: null | string, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const relationParam = request.nextUrl.searchParams.get('relation')?.trim();

  if (!id) {
    return errorResponse('user id is required', 422, { code: 'invalid-payload' });
  }

  if (!relationParam || !VALID_RELATIONS.includes(relationParam as UserRelationType)) {
    return errorResponse('relation is invalid', 422, { code: 'invalid-payload' });
  }

  const take = Math.min(
    MAX_TAKE,
    Math.max(1, parsePositiveInt(request.nextUrl.searchParams.get('take'), DEFAULT_TAKE)),
  );
  const skip = Math.max(
    0,
    parsePositiveInt(request.nextUrl.searchParams.get('skip'), DEFAULT_SKIP),
  );

  return withServerTokenRefresh(
    request,
    (token) =>
      userApi.listMyRelations(
        {
          relation: relationParam as UserRelationType,
          skip,
          take,
          userId: id,
        },
        token,
      ),
    'user-relations-fetch-failed',
    (relations) =>
      NextResponse.json(
        {
          data: relations.data,
          total: relations.total,
        },
        { status: 200 },
      ),
  );
}
