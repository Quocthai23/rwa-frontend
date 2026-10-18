import { apiClient } from '@/services/apiClient';
import { ToggleFavoriteAssetPayload, ToggleFavoriteAssetResponse } from '@/types/users';
import { CLIENT_BASE_URL } from '@/services/baseUrl';

const isServer = typeof window === 'undefined';

const encodePathSegment = (value: string): string => encodeURIComponent(value);

export type UserRelationAction = 'follow' | 'unfollow' | 'block' | 'unblock';

export type UpsertUserRelationRequest = {
  action: UserRelationAction;
};

export type UpsertUserRelationResponse = {
  isBlockedBy: boolean;
  isBlocking: boolean;
  isFollowing: boolean;
};

export type ListUserSuggestionsRequest = {
  skip?: number;
  take?: number;
};

export type UserRelationType = 'block' | 'followings' | 'follower';

export type ListMyRelationsRequest = {
  relation: UserRelationType;
  skip?: number;
  take?: number;
  userId: string;
};
export type ListMyRelationsResponse = {
  data: UserRelationListItem[];
  nextCursor?: string;
  total: number;
};

export type SuggestedUser = {
  id: string;
  name: string;
  avatar?: string;
  relation: {
    isBlockedBy: boolean;
    isBlocking: boolean;
    isFollowing: boolean;
  };
  displayName?: null | string;
  username: string;
};

export type ListUserRelationsRequest = {
  relation: UserRelationType;
  skip?: number;
  take?: number;
  userId: string;
};

export type UserRelationListItem = {
  avatar?: null | string;
  createdAt?: string;
  id: string;
  isBlockedBy?: boolean;
  isBlocking?: boolean;
  isFollowing?: boolean;
  username?: string;
};

export type ListUserRelationsResponse = {
  data: UserRelationListItem[];
  total: number;
};

const toSuggestionsQuery = (params?: ListUserSuggestionsRequest): Record<string, number> => {
  const query: Record<string, number> = {};

  if (typeof params?.take === 'number') {
    query.take = Math.min(30, Math.max(1, Math.floor(params.take)));
  }

  if (typeof params?.skip === 'number') {
    query.skip = Math.max(0, Math.floor(params.skip));
  }

  return query;
};

const toMyRelationsQuery = (params: ListMyRelationsRequest): Record<string, number | string> => {
  const query: Record<string, number | string> = {
    relation: params.relation,
  };

  if (typeof params.take === 'number') {
    query.take = Math.min(100, Math.max(1, Math.floor(params.take)));
  }

  if (typeof params.skip === 'number') {
    query.skip = Math.max(0, Math.floor(params.skip));
  }

  return query;
};

export const toggleFavoriteAssetAPI = async (payload: ToggleFavoriteAssetPayload) => {
  return apiClient.post<ToggleFavoriteAssetResponse>('/api/favorites', payload, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: true,
  });
};

export const userApi = {
  listSuggestions: async (
    params?: ListUserSuggestionsRequest,
    accessToken?: string,
  ): Promise<SuggestedUser[]> => {
    const query = toSuggestionsQuery(params);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      return apiClient.get<SuggestedUser[]>(`user/suggestions`, query, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.get<SuggestedUser[]>(`/api/user/suggestions`, query, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  upsertUserRelation: async (
    userId: string,
    payload: UpsertUserRelationRequest,
    accessToken?: string,
  ): Promise<UpsertUserRelationResponse> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.put<UpsertUserRelationResponse>(`user/${userId}/relation`, payload, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.put<UpsertUserRelationResponse>(`/api/user/${userId}/relation`, payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  listMyRelations: async (
    params: ListMyRelationsRequest,
    accessToken?: string,
  ): Promise<ListMyRelationsResponse> => {
    const query = toMyRelationsQuery(params);

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<ListMyRelationsResponse>(`user/${params.userId}/relations`, query, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.get<ListMyRelationsResponse>(`/api/user/${params.userId}/relations`, query, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },
};

