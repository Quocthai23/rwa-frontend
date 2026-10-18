import { NextRequest, NextResponse } from 'next/server';
import { backendApiClient } from '@/services/externalApiClient';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = req.headers.get('Authorization');
    const { id } = await params;
    const body = await req.json();
    const response = await backendApiClient.post(
      `proposals/${encodeURIComponent(id)}/buyout/installments`,
      {
        json: body,
        headers: authHeader ? { Authorization: authHeader } : undefined,
      },
    );
    return NextResponse.json(await response.json());
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to pay buyout installment' },
      { status: error.response?.status || 500 },
    );
  }
}
