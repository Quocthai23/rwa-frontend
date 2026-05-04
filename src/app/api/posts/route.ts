import { NextRequest, NextResponse } from 'next/server';

import { getAccessTokenFromRequest, withServerTokenRefresh } from '@/app/api/_utils/auth';
import { postApi, type CreatePostRequest, type ListPostsRequest } from '@/services/postService';

const toNumber = (value: null | string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toString = (value: null | string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toBoolean = (value: null | string, fallback = false): boolean => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: ListPostsRequest = {
    take: toNumber(searchParams.get('take')),
    skip: toNumber(searchParams.get('skip')),
    userId: toString(searchParams.get('userId')),
    assetId: toString(searchParams.get('assetId')),
    followingOnly: toBoolean(searchParams.get('followingOnly'), false),
    status: toString(searchParams.get('status')),
    search: toString(searchParams.get('search')),
    sortBy: toString(searchParams.get('sortBy')),
    sortDir: toString(searchParams.get('sortDir')) as 'asc' | 'desc' | undefined,
    fromDate: toString(searchParams.get('fromDate')),
    toDate: toString(searchParams.get('toDate')),
  };

  const buildListResponse = (data: Awaited<ReturnType<typeof postApi.listPosts>>) =>
    NextResponse.json({ data: data.data, success: true, total: data.total }, { status: 200 });

  const accessToken = getAccessTokenFromRequest(request);

  if (accessToken) {
    return withServerTokenRefresh(
      request,
      (token) => postApi.listPosts(params, token),
      'posts-list-failed',
      buildListResponse,
    );
  }

  const data = await postApi.listPosts(params);

  return buildListResponse(data);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreatePostRequest;

  return withServerTokenRefresh(
    request,
    (token) => postApi.createPost(body, token),
    'posts-create-failed',
  );
}
