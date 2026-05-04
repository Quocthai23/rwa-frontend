// import ForgotPasswordClient from '@/components/featured/forgot-password/app/ForgotPasswordClient';

// export default function ForgotPasswordPage() {
//   return <ForgotPasswordClient />;
// }

'use client';

import { ForgotPasswordAppPage } from '@/features/forgot-pasword/app/ForgotPasswordApp';
import { ForgotPasswordWebPage } from '@/features/forgot-pasword/web/ForgotPasswordWeb';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { usePathname } from 'next/navigation';

export default function ForgotPasswordPage() {
  const pathname = usePathname() || '/forgot-password';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);

  return experience === 'web' ? <ForgotPasswordWebPage /> : <ForgotPasswordAppPage />;
}
