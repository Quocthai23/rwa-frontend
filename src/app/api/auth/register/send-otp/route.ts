import { authApi } from '@/services/auth';
import {
  errorResponse,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  successResponse,
} from '@/app/api/_utils/auth';
import { getAccessTokenFromRequest } from '@/app/api/_utils/auth';

type SendOtpPayload = {
  email: string;
  purpose: 'register' | 'reset_password' | 'transfer' | 'withdrawal';
};

const PURPOSE_VALUES = ['register', 'reset_password', 'transfer', 'withdrawal'] as const;

const parsePurpose = (
  value: string | undefined,
): 'register' | 'reset_password' | 'transfer' | 'withdrawal' | undefined => {
  if (!value) {
    return undefined;
  }

  return PURPOSE_VALUES.includes(value as (typeof PURPOSE_VALUES)[number])
    ? (value as 'register' | 'reset_password' | 'transfer' | 'withdrawal')
    : undefined;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendOtpPayload;
    const token = getAccessTokenFromRequest(request);

    const email = readStringField(body, 'email');
    const purpose = parsePurpose(readStringField(body, 'purpose'));

    if (!email || !purpose) {
      return errorResponse('email and purpose are required', 422, {
        code: 'invalid-payload',
      });
    }

    const response = await authApi.sendOTP(email, purpose, token);
    return successResponse(response, 200);
  } catch (error) {
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: 'auth-send-otp-failed',
    });
  }
}
