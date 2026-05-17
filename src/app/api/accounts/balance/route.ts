import { NextRequest, NextResponse } from 'next/server';

/**
 * @deprecated getAccountBalance has been removed — the backend does not have
 * a /accounts/balance endpoint. Account balances are retrieved via /user/portfolio/overview.
 * This route returns 410 Gone to prevent silent failures.
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Account balance endpoint has been removed. Use /user/portfolio/overview instead.',
      code: 'ENDPOINT_REMOVED',
    },
    { status: 410 },
  );
}
