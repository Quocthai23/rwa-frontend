import { NextRequest } from 'next/server';
import { marketDataApi, GetValuationHistoryRequest } from '@/services/marketDataService';
import { upstreamErrorResponse, successResponse } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: GetValuationHistoryRequest = {
      assetId: searchParams.get('assetId') || '',
    };

    const areaCode = searchParams.get('areaCode');
    if (areaCode) params.areaCode = areaCode;

    const limit = searchParams.get('limit');
    if (limit) params.limit = parseInt(limit, 10);

    if (!params.assetId) {
      return upstreamErrorResponse('Missing required query parameters', 'missing-params', 400);
    }

    const data = await marketDataApi.getValuationHistory(params);
    return successResponse(data, 200);
  } catch (error) {
    return upstreamErrorResponse(error, 'market-data-valuation-history-failed');
  }
}
