import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { kycService } from '@/services/kycService';
import { ApiError } from '@/services/apiClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return await withServerTokenRefresh(
      request,
      async (token) => {
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/kyc/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
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
      'kyc-submit-failed',
    );
  } catch (err: any) {
    console.error('[KYC SUBMIT] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

