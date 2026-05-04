import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { supportApi } from '@/services/supportService';
import { SupportMessageType } from '@/types/support';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const toNumber = (value: null | string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const take = toNumber(searchParams.get('take'));
  const cursor = searchParams.get('cursor') ?? undefined;

  return withServerTokenRefresh(
    request,
    (token) => supportApi.getMessages(id, { cursor, take }, token),
    'support-messages-load-failed',
    (data) =>
      NextResponse.json(
        {
          data: data.data,
          nextCursor: data.nextCursor,
          success: true,
          total: data.total,
        },
        { status: 200 },
      ),
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    content?: string;
    isFirstMsg?: boolean;
    messageType?: SupportMessageType;
  };

  return withServerTokenRefresh(
    request,
    (token) =>
      supportApi.sendMessage(
        id,
        {
          content: body.content ?? '',
          isFirstMsg: body.isFirstMsg ?? false,
          messageType: body.messageType ?? SupportMessageType.Text,
        },
        token,
      ),
    'support-send-failed',
    (data) => NextResponse.json({ data, success: true }, { status: 200 }),
  );
}
