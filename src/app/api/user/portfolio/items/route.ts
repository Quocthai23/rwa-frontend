import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getPortfolioItems } from '@/services/portfolioService';
import type { GetPortfolioParams } from '@/services/portfolioService';

/**
 * GET /api/user/portfolio/items
 * Server-side proxy: forwards to BE /user/portfolio/items with auth
 * Supports pagination via ?take=&cursor=&sortBy=&sortDir= query params
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: GetPortfolioParams = {
    accountId: searchParams.get('accountId') || '',
  };

  const assetId = searchParams.get('assetId');
  if (assetId) params.assetId = assetId;

  const take = searchParams.get('take');
  if (take) params.take = parseInt(take, 10);

  const skip = searchParams.get('skip');
  if (skip) params.skip = parseInt(skip, 10);

  const cursor = searchParams.get('cursor');
  if (cursor) params.cursor = cursor;

  const sortBy = searchParams.get('sortBy') as GetPortfolioParams['sortBy'];
  if (sortBy) params.sortBy = sortBy;

  const sortDir = searchParams.get('sortDir') as GetPortfolioParams['sortDir'];
  if (sortDir) params.sortDir = sortDir;

  return withServerTokenRefresh(
    request,
    (token) => getPortfolioItems(params, token),
    'portfolio-items-fetch-failed',
  );
}
