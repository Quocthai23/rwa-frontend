import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { postApi } from '@/services/postService';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withServerTokenRefresh(
    request,
    (token) => postApi.toggleCommentLike(id, token),
    'posts-comments-like-toggle-failed',
  );
}
