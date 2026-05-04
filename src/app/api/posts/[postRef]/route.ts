import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { postApi } from '@/services/postService';

type RouteContext = {
  params: Promise<{ postRef: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { postRef } = await context.params;

  return withServerTokenRefresh(
    request,
    (token) => postApi.getPostDetail(postRef, token),
    'posts-detail-failed',
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { postRef } = await context.params;

  return withServerTokenRefresh(
    request,
    (token) => postApi.deletePost(postRef, token),
    'posts-delete-failed',
  );
}
