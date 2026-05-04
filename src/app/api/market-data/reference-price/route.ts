import { NextRequest } from 'next/server';
import { marketDataApi, GetReferencePriceRequest } from '@/services/marketDataService';
import { upstreamErrorResponse, successResponse } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: GetReferencePriceRequest = {
      assetId: searchParams.get('assetId') || '',
    };

    if (!params.assetId) {
      return upstreamErrorResponse('Missing required query parameters', 'missing-params', 400);
    }

    const data = await marketDataApi.getReferencePrice(params);
    return successResponse(data, 200);
  } catch (error) {
    return upstreamErrorResponse(error, 'market-data-reference-price-failed');
  }
}
