import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { ApiError } from '@/services/apiClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file1 = formData.getAll('file[]')[0];
    const file2 = formData.getAll('file[]')[1];

    if (!file1 || !file2) {
      return NextResponse.json({ error: 'Both files are required' }, { status: 400 });
    }

    return await withServerTokenRefresh(
      request,
      async (token) => {
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/kyc/fpt/checkface`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
        
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          if (res.status === 401) {
            throw new ApiError('token-expired', 'Token expired', 401);
          }
          throw new Error(`fetch failed: ${res.status} ${errBody}`);
        }
        
        const data = await res.json();
        return data.data || data;
      },
      'kyc-checkface-failed',
    );
  } catch (err: any) {
    console.error('FPT CheckFace Proxy Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

