import { NextResponse } from 'next/server';

import { getStrategyPage } from '@/services/strategyService';
import type { GetStrategyPageRequest } from '@/types/strategy';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const pageParam = searchParams.get('page');
  const sizeParam = searchParams.get('size');

  const page = pageParam != null ? Number(pageParam) : undefined;
  const size = sizeParam != null ? Number(sizeParam) : undefined;

  const params: GetStrategyPageRequest = {
    page: Number.isFinite(page as number) ? page : undefined,
    size: Number.isFinite(size as number) ? size : undefined,
    type: searchParams.get('type') ?? undefined,
    locale: searchParams.get('locale') ?? undefined,
    symbols: searchParams.get('symbols') ?? undefined,
  };

  try {
    const data = await getStrategyPage(params);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Strategy page API route error]:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
