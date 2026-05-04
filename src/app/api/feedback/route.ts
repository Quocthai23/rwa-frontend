import { NextRequest } from 'next/server';

import { feedbackApi } from '@/services/feedbackService';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { type SubmitFeedbackRequest } from '@/services/feedbackService';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SubmitFeedbackRequest;

  return withServerTokenRefresh(
    request,
    (token) => feedbackApi.submitFeedback(body, token),
    'feedback-submit-failed',
  );
}
