import { NextRequest } from 'next/server';

import { errorResponse, readStringField, withServerTokenRefresh } from '@/app/api/_utils/auth';
import { userApi, type UserRelationAction } from '@/services/userService';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpsertRelationBody = {
  action: UserRelationAction;
};

const VALID_ACTIONS: UserRelationAction[] = ['follow', 'unfollow', 'block', 'unblock'];

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as UpsertRelationBody;
  const action = readStringField(body, 'action');

  if (!action || !VALID_ACTIONS.includes(action as UserRelationAction)) {
    return errorResponse('action is invalid', 422, {
      code: 'invalid-payload',
    });
  }

  return withServerTokenRefresh(
    request,
    (token) => userApi.upsertUserRelation(id, { action: action as UserRelationAction }, token),
    'user-relation-upsert-failed',
  );
}
