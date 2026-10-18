'use client';

import { useAuthHydrated } from '@/hook/useAuthHydrated';
import SplashLogo from '@/components/shared/SplashLogo';
import AssetManagementWebScreen from '@/features/asset-management/web/AssetManagementWebScreen';
import { WebLayout } from '@/components/layouts/WebLayout';

export default function AssetManagementPage() {
  const hasHydratedAuth = useAuthHydrated();

  if (!hasHydratedAuth) {
    return <SplashLogo size={300} />;
  }

  // For MVP, we default to the Web layout.
  return (
    <WebLayout>
      <AssetManagementWebScreen />
    </WebLayout>
  );
}
