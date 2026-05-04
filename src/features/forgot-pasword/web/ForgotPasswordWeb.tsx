'use client';

import { Suspense } from 'react';
import ForgotPasswordWeb from '@/components/featured/forgot-password/web/ForgotPasswordWeb';

export function ForgotPasswordWebPage() {
  return (
    <Suspense>
      <ForgotPasswordWeb />
    </Suspense>
  );
}
