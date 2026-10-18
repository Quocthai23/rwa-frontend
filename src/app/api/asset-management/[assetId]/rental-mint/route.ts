import { NextRequest, NextResponse } from 'next/server';
import { backendApiClient } from '@/services/externalApiClient';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const authHeader = req.headers.get('Authorization');
    const { assetId } = await params;
    const body = await req.json();

    const response = await backendApiClient.post('asset-management/' + assetId + '/rental-mint', {
      json: body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    return NextResponse.json(await response.json());
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to mint rental NFT' },
      { status: error.response?.status || 500 },
    );
  }
}
