import { NextRequest, NextResponse } from 'next/server';
import { backendApiClient } from '@/services/externalApiClient';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const authHeader = req.headers.get('Authorization');
    const { assetId } = await params;

    const response = await backendApiClient.get('asset-management/' + assetId + '/eligibility', {
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    return NextResponse.json(await response.json());
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check eligibility' },
      { status: error.response?.status || 500 },
    );
  }
}
