import { NextRequest, NextResponse } from 'next/server';
import { backendApiClient } from '@/services/externalApiClient';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');

    const response = await backendApiClient.get('proposals', {
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    return NextResponse.json(await response.json());
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch all proposals' },
      { status: error.response?.status || 500 },
    );
  }
}
