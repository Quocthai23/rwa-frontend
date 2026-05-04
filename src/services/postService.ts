import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export type PostMediaLinkType = 'image' | 'video';

export type PostMediaLink = {
  link: string;
  type: PostMediaLinkType;
};

export type CreatePostRequest = {
  assetIds: string[];
  content: string;
  linksUrl: PostMediaLink[];
  repostId?: string;
};

export type CreatePostResponse = {
  [key: string]: unknown;
  post?: {
    id?: string;
  };
};

export type DeletePostCommentResponse = {
  success: boolean;
};

export type DeletePostResponse = {
  success: boolean;
};

export type ListPostsRequest = {
  assetId?: string;
  followingOnly?: boolean;
  fromDate?: string;
  search?: string;
  skip?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  status?: string;
  take?: number;
  toDate?: string;
  userId?: string;
};

export type ListBookmarkedPostsRequest = Pick<ListPostsRequest, 'skip' | 'take'>;

export type ListedPostAuthor = {
  avatar: null | string;
  bio?: null | string;
  displayName?: null | string;
  followers?: number;
  following?: number;
  id: string;
  relation?: {
    isBlockedBy?: boolean;
    isBlocking?: boolean;
    isFollowing?: boolean;
  };
  username: string;
};

export type ListedPostAsset = {
  id: string;
  logo?: null | string;
  name?: string;
  symbol?: string;
};

export type ListedPostItem = {
  aiScore: null | string;
  assetIds: string[];
  assets: ListedPostAsset[];
  author: ListedPostAuthor;
  commentCount: number;
  content: string;
  createdAt: string;
  createdById: string;
  edited: boolean;
  id: string;
  isLiked: boolean;
  isBookmarked?: boolean;
  likeCount: number;
  linksUrl: PostMediaLink[];
  note: null | string;
  repost?: null | ListedPostItem;
  repostCount: number;
  repostOfId: null | string;
  shareCount: number;
  slug: string;
  status: string;
  updatedAt: string;
  viewCount: number;
};

export type ListPostsResponse = {
  data: ListedPostItem[];
  total: number;
};

export type GetPostDetailResponse = ListedPostItem;

export type TogglePostLikeResponse = {
  isLiked: boolean;
};

export type TogglePostBookmarkResponse = {
  isBookmarked: boolean;
};

export type ListPostCommentsRequest = {
  skip?: number;
  sortDir?: 'asc' | 'desc';
  take?: number;
};

export type ListedPostCommentUser = {
  avatar: null | string;
  id: string;
  username: string;
  displayName: string;
};

export type ListedPostCommentItem = {
  content: string;
  createdAt: string;
  id: string;
  isLiked: boolean;
  likeCount: number;
  postId: string;
  replies?: ListedPostCommentItem[];
  updatedAt: string;
  user: ListedPostCommentUser;
  userId: string;
};

export type ListPostCommentsResponse = {
  data: ListedPostCommentItem[];
  total: number;
};

export type CreatePostCommentRequest = {
  content: string;
  parentId?: string;
};

export type UpdatePostCommentRequest = {
  content: string;
};

export type UpdatePostRequest = {
  assetIds?: string[];
  content: string;
  linksUrl?: PostMediaLink[];
};

export type CreatePostCommentResponse = {
  success: boolean;
};

export type UpdatePostCommentResponse = {
  success: boolean;
};

export type UpdatePostResponse = {
  success: boolean;
};

export type ToggleCommentLikeResponse = {
  isLiked: boolean;
};

type ApiClientJsonBody = NonNullable<Parameters<typeof apiClient.post<CreatePostResponse>>[1]>;

const toListQuery = (params?: ListPostsRequest): Record<string, number | string> => {
  const query: Record<string, number | string> = {
    followingOnly: 'false',
  };

  if (!params) {
    return query;
  }

  if (typeof params.take === 'number') query.take = params.take;
  if (typeof params.skip === 'number') query.skip = params.skip;
  if (params.userId) query.userId = params.userId;
  if (params.assetId) query.assetId = params.assetId;
  if (params.status) query.status = params.status;
  if (params.search) query.search = params.search;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;
  if (params.fromDate) query.fromDate = params.fromDate;
  if (params.toDate) query.toDate = params.toDate;
  if (typeof params.followingOnly === 'boolean') {
    query.followingOnly = params.followingOnly ? 'true' : 'false';
  }

  return query;
};

const toCommentsListQuery = (params?: ListPostCommentsRequest): Record<string, number | string> => {
  const query: Record<string, number | string> = {};

  if (!params) {
    return query;
  }

  if (typeof params.take === 'number') query.take = params.take;
  if (typeof params.skip === 'number') query.skip = params.skip;

  return query;
};

const toBookmarksListQuery = (
  params?: ListBookmarkedPostsRequest,
): Record<string, number | string> => {
  const query: Record<string, number | string> = {};

  if (!params) {
    return query;
  }

  if (typeof params.take === 'number') query.take = params.take;
  if (typeof params.skip === 'number') query.skip = params.skip;

  return query;
};

const toCreateCommentBody = (payload: CreatePostCommentRequest): ApiClientJsonBody => {
  const body = {
    content: payload.content,
    ...(payload.parentId ? { parentId: payload.parentId } : {}),
  };

  return body as unknown as ApiClientJsonBody;
};

const toUpdateCommentBody = (payload: UpdatePostCommentRequest): ApiClientJsonBody => {
  return {
    content: payload.content,
  } as unknown as ApiClientJsonBody;
};

const toUpdatePostBody = (payload: UpdatePostRequest): ApiClientJsonBody => {
  const body = {
    content: payload.content,
    ...(payload.linksUrl ? { linksUrl: payload.linksUrl } : {}),
    ...(payload.assetIds ? { assetIds: payload.assetIds } : {}),
  };

  return body as unknown as ApiClientJsonBody;
};

const encodePathSegment = (value: string): string => encodeURIComponent(value);

export const postApi = {
  listPosts: async (
    params?: ListPostsRequest,
    accessToken?: string,
  ): Promise<ListPostsResponse> => {
    const query = toListQuery(params);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.get<ListPostsResponse>(
        'posts/',
        query,
        {
          headers,
          skipAuth: !accessToken,
        },
        true,
      );
    }

    return apiClient.get<ListPostsResponse>(
      '/api/posts',
      query,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
      true,
    );
  },

  listBookmarkedPosts: async (
    params?: ListBookmarkedPostsRequest,
    accessToken?: string,
  ): Promise<ListPostsResponse> => {
    const query = toBookmarksListQuery(params);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.get<ListPostsResponse>(
        'posts/me/bookmarks',
        query,
        {
          headers,
          skipAuth: !accessToken,
        },
        true,
      );
    }

    return apiClient.get<ListPostsResponse>(
      '/api/posts/me/bookmarks',
      query,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
      true,
    );
  },

  getPostDetail: async (postRef: string, accessToken?: string): Promise<GetPostDetailResponse> => {
    const encodedPostRef = encodePathSegment(postRef);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.get<GetPostDetailResponse>(`posts/${encodedPostRef}`, undefined, {
        headers,
        skipAuth: false,
      });
    }

    return apiClient.get<GetPostDetailResponse>(`/api/posts/${encodedPostRef}`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  createPost: async (
    payload: CreatePostRequest,
    accessToken?: string,
  ): Promise<CreatePostResponse> => {
    const body = payload as unknown as ApiClientJsonBody;

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.post<CreatePostResponse>('posts/', body, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<CreatePostResponse>('/api/posts', body, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  createPostComment: async (
    postRef: string,
    payload: CreatePostCommentRequest,
    accessToken?: string,
  ): Promise<CreatePostCommentResponse> => {
    const encodedPostRef = encodePathSegment(postRef);
    const body = toCreateCommentBody(payload);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.post<CreatePostCommentResponse>(`posts/${encodedPostRef}/comments`, body, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<CreatePostCommentResponse>(
      `/api/posts/${encodedPostRef}/comments`,
      body,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },

  updatePost: async (
    postRef: string,
    payload: UpdatePostRequest,
    accessToken?: string,
  ): Promise<UpdatePostResponse> => {
    const encodedPostRef = encodePathSegment(postRef);
    const body = toUpdatePostBody(payload);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.patch<UpdatePostResponse>(`posts/${encodedPostRef}`, body, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.patch<UpdatePostResponse>(`/api/posts/update/${encodedPostRef}`, body, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  deletePost: async (postRef: string, accessToken?: string): Promise<DeletePostResponse> => {
    const encodedPostRef = encodePathSegment(postRef);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.delete<DeletePostResponse>(`posts/${encodedPostRef}`, undefined, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.delete<DeletePostResponse>(`/api/posts/${encodedPostRef}`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  deletePostComment: async (
    commentId: string,
    accessToken?: string,
  ): Promise<DeletePostCommentResponse> => {
    const encodedCommentId = encodePathSegment(commentId);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.delete<DeletePostCommentResponse>(
        `posts/comments/${encodedCommentId}`,
        undefined,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    }

    return apiClient.delete<DeletePostCommentResponse>(
      `/api/posts/comments/${encodedCommentId}`,
      undefined,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },

  updatePostComment: async (
    commentId: string,
    payload: UpdatePostCommentRequest,
    accessToken?: string,
  ): Promise<UpdatePostCommentResponse> => {
    const encodedCommentId = encodePathSegment(commentId);
    const body = toUpdateCommentBody(payload);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.patch<UpdatePostCommentResponse>(
        `posts/comments/${encodedCommentId}`,
        body,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    }

    return apiClient.patch<UpdatePostCommentResponse>(
      `/api/posts/comments/${encodedCommentId}`,
      body,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },

  listPostComments: async (
    postRef: string,
    params?: ListPostCommentsRequest,
    accessToken?: string,
  ): Promise<ListPostCommentsResponse> => {
    const encodedPostRef = encodePathSegment(postRef);
    const query = toCommentsListQuery(params);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.get<ListPostCommentsResponse>(
        `posts/${encodedPostRef}/comments`,
        query,
        {
          headers,
          skipAuth: !accessToken,
        },
        true,
      );
    }

    return apiClient.get<ListPostCommentsResponse>(
      `/api/posts/${encodedPostRef}/comments`,
      query,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
      true,
    );
  },

  toggleCommentLike: async (
    commentId: string,
    accessToken?: string,
  ): Promise<ToggleCommentLikeResponse> => {
    const encodedCommentId = encodePathSegment(commentId);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.post<ToggleCommentLikeResponse>(
        `posts/comments/${encodedCommentId}/like`,
        undefined,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    }

    return apiClient.post<ToggleCommentLikeResponse>(
      `/api/posts/comments/${encodedCommentId}/like`,
      undefined,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },

  togglePostLike: async (
    postRef: string,
    accessToken?: string,
  ): Promise<TogglePostLikeResponse> => {
    const encodedPostRef = encodePathSegment(postRef);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.post<TogglePostLikeResponse>(`posts/${encodedPostRef}/like`, undefined, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<TogglePostLikeResponse>(`/api/posts/${encodedPostRef}/like`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  togglePostBookmark: async (
    postRef: string,
    accessToken?: string,
  ): Promise<TogglePostBookmarkResponse> => {
    const encodedPostRef = encodePathSegment(postRef);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.post<TogglePostBookmarkResponse>(
        `posts/${encodedPostRef}/bookmark`,
        undefined,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    }

    return apiClient.post<TogglePostBookmarkResponse>(
      `/api/posts/${encodedPostRef}/bookmark`,
      undefined,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },
};
