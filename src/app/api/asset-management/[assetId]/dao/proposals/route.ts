import { NextRequest, NextResponse } from 'next/server';
import { ASSET_MANAGEMENT_ENDPOINTS } from '@/constants/api';
import { ApiError, apiClient } from '@/services/apiClient';
import { getAccessTokenFromRequest } from '@/app/api/_utils/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> | { assetId: string } }
) {
  try {
    const { assetId } = await params;
    const payload = await req.json();
    
    const accessToken = getAccessTokenFromRequest(req);
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

    const response = await apiClient.post<any>(
      ASSET_MANAGEMENT_ENDPOINTS.BUYOUT_PROPOSALS(assetId),
      payload,
      { headers }
    );
    
    return NextResponse.json(response);
  } catch (error) {
    const status = error instanceof ApiError ? error.status ?? 500 : 500;
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to create proposal on the backend';
    return NextResponse.json(
      { message },
      { status }
    );
  }
}
