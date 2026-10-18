import { API_BASE_URL } from '@/constants/env';
import { apiClient } from '@/services/apiClient';
import {
  errorResponse,
  getAccessTokenFromRequest,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  successResponse,
} from '@/app/api/_utils/auth';

type ChangePasswordPayload = {
  newPassword: string;
  oldPassword?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChangePasswordPayload;
    const oldPassword = readStringField(body, 'oldPassword');
    const newPassword = readStringField(body, 'newPassword');
    const accessToken = getAccessTokenFromRequest(request);

    if (!accessToken) {
      return errorResponse('Unauthorized', 401, { code: 'missing-token' });
    }

    if (!newPassword) {
      return errorResponse('newPassword is required', 422, {
        code: 'invalid-payload',
      });
    }

    const payload: { newPassword: string; oldPassword?: string } = { newPassword };
    if (oldPassword) {
      payload.oldPassword = oldPassword;
    }

    const backendUrl = API_BASE_URL || 'http://localhost:3001';
    
    const { data: responseData } = await apiClient.postWithResponse<unknown>('auth/change-password', payload, {
      baseUrl: backendUrl,
      skipAuth: true,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return successResponse(responseData, 200);
  } catch (error) {
    const message = getErrorMessage(error);
    const status = getErrorStatus(error, 500);

    return errorResponse(message, status === 0 ? 500 : status, {
      code: 'auth-change-password-failed',
    });
  }
}

