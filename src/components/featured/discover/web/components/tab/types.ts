export type DiscoverTabId = 'for-you' | 'following' | 'profile' | 'bookmarks';

export type ComposerImage = {
  id: string;
  previewUrl: string;
  status: 'uploaded' | 'uploading';
  uploadedUrl?: string;
};

export type ComposerLinkedAsset = {
  id: string;
  symbol: string;
};
