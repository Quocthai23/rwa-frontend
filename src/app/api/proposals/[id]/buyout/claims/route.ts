import { NextRequest } from 'next/server';
import { protectedBackend } from '@/app/api/_utils/protectedBackend';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return protectedBackend(request, `proposals/${encodeURIComponent(id)}/buyout/claims`, await request.json());
}
