import { authApi } from '@/services/auth';
import {
  errorResponse,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  successResponse,
} from '@/app/api/_utils/auth';

type ResetPasswordPayload = {
  resetPasswordToken: string;
  newPassword: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPasswordPayload;
    const resetPasswordToken = readStringField(body, 'resetPasswordToken');
    const newPassword = readStringField(body, 'newPassword');

    if (!resetPasswordToken || !newPassword) {
      return errorResponse('resetPasswordToken and newPassword are required', 422, {
        code: 'invalid-payload',
      });
    }

    const response = await authApi.resetPassword(resetPasswordToken, newPassword);

    return successResponse(response, 200);
  } catch (error) {
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: 'auth-reset-password-failed',
    });
  }
}
