'use client';

import { Suspense } from 'react';
import LoginForm from '@/components/featured/login/app/LoginForm';

export function LoginAppPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
