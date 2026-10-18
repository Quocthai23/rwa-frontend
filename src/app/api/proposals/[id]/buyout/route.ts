import { NextRequest, NextResponse } from 'next/server';
import { backendApiClient } from '@/services/externalApiClient';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = req.headers.get('Authorization');
    const { id } = await params;
    const response = await backendApiClient.get(
      `proposals/${encodeURIComponent(id)}/buyout`,
      { headers: authHeader ? { Authorization: authHeader } : undefined },
    );
    return NextResponse.json(await response.json());
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch buyout state' },
      { status: error.response?.status || 500 },
    );
  }
}
