import { NextRequest, NextResponse } from 'next/server';
import { updatePosition, type UpdatePositionParams } from '@/services/positionService';
import { withServerTokenRefresh } from '../../_utils/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ positionId: string }> },
) {
  const { positionId } = await params;
  const body = await request.json();
  const { accountId, stopLossPrice, takeProfitPrice } = body;

  if (!accountId) {
    return NextResponse.json(
      { errors: 'Missing required fields: accountId', success: false },
      { status: 400 },
    );
  }

  const updateParams: UpdatePositionParams = {
    accountId,
    stopLossPrice,
    takeProfitPrice,
  };

  return withServerTokenRefresh(
    request,
    (token) => updatePosition(positionId, updateParams, token),
    'position-update-failed',
    // (data) => NextResponse.json({ data }, { status: 200 }),
  );
}
