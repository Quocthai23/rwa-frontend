import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { supportApi } from '@/services/supportService';
import { SupportMessageType, SupportTicketSubject } from '@/types/support';

export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    // Upstream currently returns validation-error for skip/take despite swagger schema.
    // Keep proxy resilient by omitting pagination params for now.
    (token) => supportApi.getTickets(undefined, token),
    'support-list-failed',
    (data) =>
      NextResponse.json({ data: data.data, success: true, total: data.total }, { status: 200 }),
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    message?: string;
    messageType?: SupportMessageType;
    subject?: SupportTicketSubject;
  };

  return withServerTokenRefresh(
    request,
    (token) =>
      supportApi.createTicket(
        {
          message: body.message,
          messageType: body.messageType,
          subject: body.subject ?? SupportTicketSubject.Other,
        },
        token,
      ),
    'support-create-failed',
    (data) => NextResponse.json({ data, success: true }, { status: 200 }),
  );
}
