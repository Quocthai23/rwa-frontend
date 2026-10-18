import { imageApi } from './imageService';
import { apiClient } from './apiClient';

export interface CreateAssetParams {
  symbol: string;
  name: string;
  description?: string;
  logo?: string;
  categoryId: string;
  totalSupply: number;
  tokenPrice: number;
  expectedApy?: number;
  [key: string]: any;
}

export interface SubmitOnboardingParams {
  legalDocumentUrls: string[];
  ownerNote?: string;
  [key: string]: any;
}

const assetDeploymentService = {
  createAsset: async (params: CreateAssetParams) => {
    const response = await apiClient.post<{ data: { id: string } }>('/admin/assets', params);
    return response;
  },

  submitOnboarding: async (assetId: string, params: SubmitOnboardingParams) => {
    const response = await apiClient.post(`/assets/${assetId}/onboarding/submit`, params);
    return response;
  },

  uploadDocument: async (file: File) => {
    return imageApi.uploadImageToPresignedUrl(file);
  },
};

export default assetDeploymentService;

