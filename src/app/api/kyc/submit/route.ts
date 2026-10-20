import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { kycService } from '@/services/kycService';
export async function POST(request: NextRequest) {
 let body; try { body = await request.json(); } catch { return NextResponse.json({ success: false, errors: { code: 'invalid-json' } }, { status: 400 }); }
 return withServerTokenRefresh(request, token => kycService.submitKyc(body, token), 'kyc-submit-failed');
}
