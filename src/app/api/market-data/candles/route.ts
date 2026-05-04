import { NextRequest } from 'next/server';
import { marketDataApi, GetCandlesRequest } from '@/services/marketDataService';
import { upstreamErrorResponse, successResponse } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: GetCandlesRequest = {
      assetId: searchParams.get('assetId') || '',
      resolution: (searchParams.get('resolution') as any) || '1d',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
    };

    if (!params.assetId || !params.resolution || !params.from || !params.to) {
      return upstreamErrorResponse('Missing required query parameters', 'missing-params', 400);
    }

    const data = await marketDataApi.getCandles(params);
    return successResponse(data, 200);
  } catch (error) {
    return upstreamErrorResponse(error, 'market-data-candles-failed');
  }
}
