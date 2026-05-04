'use client';

import { Suspense } from 'react';
import ForgotPasswordClient from '@/components/featured/forgot-password/app/ForgotPasswordClient';

export function ForgotPasswordAppPage() {
  return (
    <Suspense>
      <ForgotPasswordClient />
    </Suspense>
  );
}
