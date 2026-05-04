'use client';

import { Suspense } from 'react';
import RegisterWebForm from '@/components/featured/register/web/RegisterWebForm';

export function RegisterWebPage() {
  return (
    <Suspense>
      <RegisterWebForm />
    </Suspense>
  );
}
