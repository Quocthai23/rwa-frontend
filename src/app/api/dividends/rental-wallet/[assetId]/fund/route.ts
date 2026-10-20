import { NextRequest } from 'next/server';

import { errorResponse, withServerTokenRefresh } from '@/app/api/_utils/auth';
import { fundRentalWallet, type FundRentalWalletPayload } from '@/services/dividendService';

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { assetId } = await context.params;
  const payload = (await request.json().catch(() => null)) as FundRentalWalletPayload | null;

  if (!payload || typeof payload.amountVnd !== 'string') {
    return errorResponse('amountVnd is required', 422, { code: 'invalid-payload' });
  }

  return withServerTokenRefresh(
    request,
    (token) => fundRentalWallet(assetId, payload, token),
    'rental-wallet-fund-failed',
  );
}
