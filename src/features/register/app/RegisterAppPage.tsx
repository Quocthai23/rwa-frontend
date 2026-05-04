'use client';

import { Suspense } from 'react';
import RegisterApp from '@/components/featured/register/app/RegisterApp';

export function RegisterAppPage() {
  return (
    <Suspense>
      <RegisterApp />
    </Suspense>
  );
}
