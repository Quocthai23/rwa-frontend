// types/users.ts

export type ToggleFavoriteAssetPayload = {
  assetId: string;
};

export type ToggleFavoriteAssetResponse = {
  isFavorite: boolean;
};
