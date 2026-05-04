import { NextRequest } from 'next/server';
import { getAccounts } from '@/services/accountService';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  return withServerTokenRefresh(request, (token) => getAccounts(token), 'accounts-fetch-failed');
}
