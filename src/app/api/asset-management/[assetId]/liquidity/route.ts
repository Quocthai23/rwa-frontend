import { NextRequest, NextResponse } from 'next/server';
import { backendApiClient } from '@/services/externalApiClient';

const getStatus = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return 500;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : 500;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const authHeader = req.headers.get('Authorization');
    const { assetId } = await params;
    const response = await backendApiClient.get(
      `asset-management/${assetId}/liquidity`,
      { headers: authHeader ? { Authorization: authHeader } : undefined },
    );
    return NextResponse.json(await response.json());
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch asset liquidity',
      },
      { status: getStatus(error) },
    );
  }
}
