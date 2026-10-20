import { NextRequest } from 'next/server';
import { protectedBackend } from '@/app/api/_utils/protectedBackend';

export async function GET(request: NextRequest) {
  return protectedBackend(request, `proposals`);
}
