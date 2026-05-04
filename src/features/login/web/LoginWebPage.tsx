'use client';

import { Suspense } from 'react';
import LoginWebForm from '@/components/featured/login/web/LoginWebForm';

export function LoginWebPage() {
  return (
    <Suspense>
      <LoginWebForm />
    </Suspense>
  );
}
