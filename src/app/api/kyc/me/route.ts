import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { kycService } from '@/services/kycService';

export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => kycService.getMyKyc(token),
    'kyc-me-failed',
  );
}
