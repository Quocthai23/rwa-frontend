import { NextRequest, NextResponse } from 'next/server';

import { backendApiClient } from '@/services/externalApiClient';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const authHeader = req.headers.get('Authorization');
    const { assetId } = await params;
    const response = await backendApiClient.get(
      `asset-management/${assetId}/activity`,
      { headers: authHeader ? { Authorization: authHeader } : undefined },
    );
    return NextResponse.json(await response.json());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch asset activity';
    return NextResponse.json({ message }, { status: 500 });
  }
}
