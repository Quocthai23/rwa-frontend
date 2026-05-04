import { NextRequest, NextResponse } from 'next/server';
import { closePositions } from '@/services/positionService';
import { withServerTokenRefresh } from '../../../_utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ positionId: string }> },
) {
  const { positionId } = await params;
  const body = await request.json();
  const accountId = body.accountId || '';
  const quantity = body.quantity || '0';

  if (!positionId || !accountId || !quantity) {
    return NextResponse.json(
      { errors: 'Missing required parameters: positionId, accountId, quantity', success: false },
      { status: 400 },
    );
  }

  return withServerTokenRefresh(
    request,
    (token) => closePositions(positionId, accountId, quantity, token),
    'position-close-failed',
    (data) => NextResponse.json({ data, success: true }, { status: 200 }),
  );
}
