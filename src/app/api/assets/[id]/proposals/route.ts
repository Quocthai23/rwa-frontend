import { NextRequest } from 'next/server';
import { protectedBackend } from '@/app/api/_utils/protectedBackend';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return protectedBackend(request, `assets/${encodeURIComponent(id)}/proposals`);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return protectedBackend(request, `assets/${encodeURIComponent(id)}/proposals`, await request.json());
}
