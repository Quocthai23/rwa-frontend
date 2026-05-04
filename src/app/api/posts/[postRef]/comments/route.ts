import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import {
  postApi,
  type CreatePostCommentRequest,
  type ListPostCommentsRequest,
} from '@/services/postService';

const toNumber = (value: null | string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

type RouteContext = {
  params: Promise<{ postRef: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { postRef } = await context.params;
  const { searchParams } = new URL(request.url);

  const params: ListPostCommentsRequest = {
    skip: toNumber(searchParams.get('skip')),
    sortDir: (searchParams.get('sortDir') as 'asc' | 'desc' | null) || undefined,
    take: toNumber(searchParams.get('take')),
  };

  return withServerTokenRefresh(
    request,
    (token) => postApi.listPostComments(postRef, params, token),
    'posts-comments-list-failed',
    (data) =>
      NextResponse.json({ data: data.data, success: true, total: data.total }, { status: 200 }),
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { postRef } = await context.params;
  const body = (await request.json()) as CreatePostCommentRequest;

  return withServerTokenRefresh(
    request,
    (token) =>
      postApi.createPostComment(
        postRef,
        {
          content: body.content,
          ...(body.parentId ? { parentId: body.parentId } : {}),
        },
        token,
      ),
    'posts-comments-create-failed',
  );
}
