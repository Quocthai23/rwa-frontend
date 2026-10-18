import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';

import { readStringField, successResponse, withServerTokenRefresh } from '@/app/api/_utils/auth';
import { ApiError } from '@/services/apiClient';
import { getAccounts } from '@/services/accountService';

const WS_TICKET_TTL_SECONDS = 60;

const getWsTicketSecret = (): Uint8Array | null => {
  const secret = process.env.WS_TICKET_SECRET?.trim();

  if (!secret) {
    return null;
  }

  return new TextEncoder().encode(secret);
};

const parseJsonBody = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return {};
  }
};

const signWsTicket = async (payload: { accountId?: string }): Promise<string> => {
  const secret = getWsTicketSecret();

  if (!secret) {
    throw new ApiError('ws-ticket-secret-missing', 'Missing WS ticket secret', 500);
  }

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${WS_TICKET_TTL_SECONDS}s`)
    .sign(secret);

  return jwt;
};

export async function POST(request: NextRequest) {
  const body = await parseJsonBody(request);
  const accountId = readStringField(body, 'accountId');

  return withServerTokenRefresh(
    request,
    async (accessToken) => {
      const accounts = await getAccounts(accessToken);

      if (accountId && !accounts.some((account) => account.id === accountId)) {
        throw new ApiError('account-forbidden', 'Forbidden account', 403);
      }

      const ticket = await signWsTicket({ accountId });

      return {
        expiresAt: new Date(Date.now() + WS_TICKET_TTL_SECONDS * 1000).toISOString(),
        expiresInSeconds: WS_TICKET_TTL_SECONDS,
        ticket,
      };
    },
    'ws-ticket-auth-failed',
    (data) => successResponse(data, 200),
  );
}

