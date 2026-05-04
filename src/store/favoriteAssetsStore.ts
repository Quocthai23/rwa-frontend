import { create } from 'zustand';

type FavoriteAssetsState = {
  assetIdBySymbol: Record<string, string>; // Map symbol to assetId
  clearFavorites: () => void;
  favoritesByAssetId: Record<string, boolean>;
  favoritesBySymbol: Record<string, boolean>;
  getAssetIdBySymbol: (symbol: string) => string | undefined;
  isFavoriteAssetId: (assetId: string) => boolean;
  isFavoriteSymbol: (symbol: string) => boolean;
  setFavoriteByAssetId: (assetId: string, isFavorite: boolean) => void;
  setFavoriteBySymbol: (symbol: string, isFavorite: boolean, assetId?: string) => void;
};

export const useFavoriteAssetsStore = create<FavoriteAssetsState>((set, get) => ({
  assetIdBySymbol: {},
  clearFavorites: () => {
    set({
      assetIdBySymbol: {},
      favoritesByAssetId: {},
      favoritesBySymbol: {},
    });
  },
  favoritesByAssetId: {},

  favoritesBySymbol: {},

  getAssetIdBySymbol: (symbol: string) => {
    return get().assetIdBySymbol[symbol];
  },

  isFavoriteAssetId: (assetId: string) => {
    return get().favoritesByAssetId[assetId] ?? false;
  },

  isFavoriteSymbol: (symbol: string) => {
    return get().favoritesBySymbol[symbol] ?? false;
  },

  setFavoriteByAssetId: (assetId: string, isFavorite: boolean) => {
    set((state) => ({
      favoritesByAssetId: {
        ...state.favoritesByAssetId,
        [assetId]: isFavorite,
      },
    }));
  },

  setFavoriteBySymbol: (symbol: string, isFavorite: boolean, assetId?: string) => {
    set((state) => {
      if (assetId) {
        return {
          favoritesBySymbol: {
            ...state.favoritesBySymbol,
            [symbol]: isFavorite,
          },
          assetIdBySymbol: {
            ...state.assetIdBySymbol,
            [symbol]: assetId,
          },
          favoritesByAssetId: {
            ...state.favoritesByAssetId,
            [assetId]: isFavorite,
          },
        };
      }
      return {
        favoritesBySymbol: {
          ...state.favoritesBySymbol,
          [symbol]: isFavorite,
        },
      };
    });
  },
}));
