import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { postApi } from '@/services/postService';

type RouteContext = {
  params: Promise<{ postRef: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { postRef } = await context.params;

  return withServerTokenRefresh(
    request,
    (token) => postApi.togglePostLike(postRef, token),
    'posts-like-toggle-failed',
  );
}
