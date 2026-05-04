import { authApi } from '@/services/auth';
import {
  errorResponse,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  successResponse,
} from '@/app/api/_utils/auth';

type CheckReferenceCodePayload = {
  referenceCode: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckReferenceCodePayload;
    const referenceCode = readStringField(body, 'referenceCode');

    if (!referenceCode) {
      return errorResponse('referenceCode is required', 422, {
        code: 'invalid-payload',
      });
    }

    const response = await authApi.checkReferenceCode(referenceCode);
    return successResponse(response, 200);
  } catch (error) {
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: 'auth-check-reference-code-failed',
    });
  }
}
