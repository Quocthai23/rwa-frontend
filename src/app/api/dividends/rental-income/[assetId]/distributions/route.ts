import { NextRequest } from 'next/server';
import { protectedBackend } from '@/app/api/_utils/protectedBackend';

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return protectedBackend(request, `dividends/rental-income/${encodeURIComponent(assetId)}/distributions`);
}
