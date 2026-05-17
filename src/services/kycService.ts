import { KYC_ENDPOINTS } from '@/constants/api';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

/**
 * Upload a file via the server-side BFF route (/api/images/upload).
 * This avoids the client-side presigned-URL flow which requires a
 * JS-readable access_token cookie that may be absent on fresh loads.
 */
async function uploadFileThroughServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('type', file.type || 'image/jpeg');
  formData.append('fileName', file.name || 'photo.jpg');

  const response = await fetch('/api/images/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { errors?: string }).errors ||
        `Upload failed with status ${response.status}`,
    );
  }

  const body = (await response.json()) as { data?: { avatar?: string } };
  const url = body?.data?.avatar;
  if (!url) throw new Error('No URL returned from upload');
  return url;
}

export type KycStatus = 'PENDING' | 'APPROVING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';

export type KycData = {
  id: string;
  userId: string;
  fullName: string;
  dob: string;
  idNumber: string;
  idFrontImg: string;
  idBackImg: string;
  selfieImg: string;
  status: KycStatus;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type SubmitKycRequest = {
  fullName: string;
  dob: string;
  idNumber: string;
  idFrontImg: string;
  idBackImg: string;
  selfieImg: string;
};

export const kycService = {
  async getMyKyc(authHeader?: string): Promise<KycData | null> {
    if (isServer) {
      const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
      return apiClient.get<KycData>(KYC_ENDPOINTS.ME, undefined, { headers });
    }

    return apiClient.get<KycData>('/api/kyc/me', undefined, {
      baseUrl: CLIENT_BASE_URL,
    });
  },

  async submitKyc(data: SubmitKycRequest, authHeader?: string): Promise<KycData> {
    if (isServer) {
      const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
      return apiClient.post<KycData>(KYC_ENDPOINTS.SUBMIT, data, { headers });
    }

    return apiClient.post<KycData>('/api/kyc/submit', data, {
      baseUrl: CLIENT_BASE_URL,
    });
  },

  async uploadKycImage(file: File): Promise<string> {
    if (isServer) {
      // Server context: use imageApi directly (has auth headers)
      const { imageApi } = await import('./imageService');
      return imageApi.uploadImageToPresignedUrl(file);
    }
    // Client context: route through the server BFF to avoid needing a
    // JS-readable token (the httpOnly cookie is sent automatically).
    return uploadFileThroughServer(file);
  }
};

export default kycService;
