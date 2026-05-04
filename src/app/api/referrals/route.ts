import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getReferralMembers, type ReferralMembersParams } from '@/services/referralService';

const toNumber = (value: null | string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toString = (value: null | string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const userId = toString(searchParams.get('userId'));
  if (!userId) {
    return NextResponse.json({ errors: 'Missing userId', success: false }, { status: 400 });
  }

  const params: ReferralMembersParams = {
    userId,
    skip: toNumber(searchParams.get('skip')),
    take: toNumber(searchParams.get('take')),
    fromDate: toString(searchParams.get('fromDate')),
    toDate: toString(searchParams.get('toDate')),
    search: toString(searchParams.get('search')),
  };

  return withServerTokenRefresh(
    request,
    (token) => getReferralMembers(params, token),
    'referrals-members-fetch-failed',
    (data) => NextResponse.json(data, { status: 200 }),
  );
}
