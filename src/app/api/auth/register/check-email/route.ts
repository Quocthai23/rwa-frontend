import { authApi } from '@/services/auth';
import {
  errorResponse,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  successResponse,
} from '@/app/api/_utils/auth';

type CheckEmailPayload = {
  email: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckEmailPayload;
    const email = readStringField(body, 'email');

    if (!email) {
      return errorResponse('email is required', 422, {
        code: 'invalid-payload',
      });
    }

    const response = await authApi.checkEmail(email);
    return successResponse(response, 200);
  } catch (error) {
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: 'auth-check-email-failed',
    });
  }
}
