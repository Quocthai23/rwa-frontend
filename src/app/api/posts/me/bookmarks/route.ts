import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { postApi, type ListBookmarkedPostsRequest } from '@/services/postService';

const toNumber = (value: null | string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: ListBookmarkedPostsRequest = {
    skip: toNumber(searchParams.get('skip')),
    take: toNumber(searchParams.get('take')),
  };

  return withServerTokenRefresh(
    request,
    (token) => postApi.listBookmarkedPosts(params, token),
    'posts-bookmarks-list-failed',
    (data) =>
      NextResponse.json({ data: data.data, success: true, total: data.total }, { status: 200 }),
  );
}
