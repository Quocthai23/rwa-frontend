import { NextRequest, NextResponse } from 'next/server';
import { closeAllPositions } from '@/services/positionService';
import { withServerTokenRefresh } from '../../_utils/auth';

type PositionIdentifier = { id?: string | number } | string;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    accountId?: string;
    positionIds?: PositionIdentifier[];
  };
  const accountId = body.accountId || '';
  const positionIds: string[] = (body.positionIds || []).map((id) => {
    if (typeof id === 'string') {
      return id;
    }
    return id?.id ? id.id.toString() : String(id);
  });

  if (!accountId || positionIds.length === 0) {
    return NextResponse.json(
      { errors: 'Missing required parameters: accountId, positionIds', success: false },
      { status: 400 },
    );
  }

  return withServerTokenRefresh(
    request,
    (token) => closeAllPositions(accountId, positionIds, token),
    'positions-bulk-close-failed',
    () => NextResponse.json({ success: true }, { status: 200 }),
  );
}
