import { NextRequest } from 'next/server';
import { updateAccountLeverage } from '@/services/accountService';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { leverage } = await request.json();
  const { id: accountId } = await params;

  if (typeof accountId !== 'string' || typeof leverage !== 'number') {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  return withServerTokenRefresh(
    request,
    (token) => updateAccountLeverage(accountId, leverage, token),
    'accounts-update-leverage-failed',
  );
}
