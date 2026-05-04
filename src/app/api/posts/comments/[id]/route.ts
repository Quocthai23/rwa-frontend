import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { postApi, type UpdatePostCommentRequest } from '@/services/postService';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withServerTokenRefresh(
    request,
    (token) => postApi.deletePostComment(id, token),
    'posts-comments-delete-failed',
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as UpdatePostCommentRequest;

  return withServerTokenRefresh(
    request,
    (token) => postApi.updatePostComment(id, { content: body.content }, token),
    'posts-comments-update-failed',
  );
}
