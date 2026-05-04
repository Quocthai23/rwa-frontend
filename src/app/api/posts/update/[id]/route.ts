import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { postApi, type UpdatePostRequest } from '@/services/postService';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as UpdatePostRequest;

  return withServerTokenRefresh(
    request,
    (token) =>
      postApi.updatePost(
        id,
        {
          content: body.content,
          linksUrl: body.linksUrl,
          assetIds: body.assetIds,
        },
        token,
      ),
    'posts-update-failed',
  );
}
