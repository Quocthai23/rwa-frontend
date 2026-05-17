import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getPortfolioOverview } from '@/services/portfolioService';

/**
 * GET /api/user/portfolio/overview
 * Server-side proxy: forwards to BE /user/portfolio/overview with auth
 * The BE returns { data: PortfolioOverview, success: true } which is passed through as-is.
 */
export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => getPortfolioOverview(undefined, token),
    'portfolio-overview-fetch-failed',
  );
}
