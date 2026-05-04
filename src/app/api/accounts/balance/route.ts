import { NextRequest, NextResponse } from 'next/server';
import { getAccountBalance } from '@/services/accountService';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ errors: 'Missing accountId', success: false }, { status: 400 });
  }

  return withServerTokenRefresh(
    request,
    (token) => getAccountBalance(accountId, token),
    'account-balance-fetch-failed',
  );
}
