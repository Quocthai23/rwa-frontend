import { NextRequest, NextResponse } from 'next/server';

/**
 * @deprecated updateAccountLeverage has been removed — the backend Accounts API
 * does not support leverage updates. This is a Spot-only platform.
 * Returns 410 Gone to prevent silent failures.
 */
export async function PATCH(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Account leverage update is not supported. This is a Spot-only platform.', code: 'ENDPOINT_REMOVED' },
    { status: 410 },
  );
}
