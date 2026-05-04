import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ApiError } from '@/services/apiClient';
import { toggleFavoriteAssetAPI } from '@/services/userService';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import type { ToggleFavoriteAssetPayload, ToggleFavoriteAssetResponse } from '@/types/users';
import i18n from '@/i18n';
import { localizeApiError } from '@/i18n/apiErrors';

import { useToast } from '../useToast';

export const useToggleFavoriteAsset = () => {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const t = i18n.t.bind(i18n);
  const setFavoriteByAssetId = useFavoriteAssetsStore((s) => s.setFavoriteByAssetId);
  const isFavoriteAssetId = useFavoriteAssetsStore((s) => s.isFavoriteAssetId);

  return useMutation<ToggleFavoriteAssetResponse, ApiError, ToggleFavoriteAssetPayload>({
    mutationFn: toggleFavoriteAssetAPI,
    onError: (error) => {
      console.error('Error toggling favorite asset:', error);
      showError(t('apiErrors.generic'), localizeApiError(error, t));
    },
    onSuccess: (_data, variables) => {
      const current = isFavoriteAssetId(variables.assetId);
      const next = !current;
      setFavoriteByAssetId(variables.assetId, next);

      // Invalidate assets list to refresh favorite status
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
};
