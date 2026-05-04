import { Suspense } from 'react';

import VerifyAuthenticatorPageComponent from '@/components/featured/verify-authenticator/VerifyAuthenticator';

export default function VerifyAuthenticatorPage() {
  return (
    <Suspense fallback={null}>
      <VerifyAuthenticatorPageComponent />
    </Suspense>
  );
}
