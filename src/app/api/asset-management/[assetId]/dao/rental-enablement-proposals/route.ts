import { NextRequest } from 'next/server';
import { protectedBackend } from '@/app/api/_utils/protectedBackend';

export async function POST(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return protectedBackend(request, `asset-management/${encodeURIComponent(assetId)}/dao/rental-enablement-proposals`, await request.json());
}
