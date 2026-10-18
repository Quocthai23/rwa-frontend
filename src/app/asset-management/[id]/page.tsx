'use client';

import { use } from 'react';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import SplashLogo from '@/components/shared/SplashLogo';
import AssetDetailWebScreen from '@/features/asset-management/web/AssetDetailWebScreen';
import { WebLayout } from '@/components/layouts/WebLayout';

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hasHydratedAuth = useAuthHydrated();

  if (!hasHydratedAuth) {
    return <SplashLogo size={300} />;
  }

  return (
    <WebLayout>
      <AssetDetailWebScreen assetId={resolvedParams.id} />
    </WebLayout>
  );
}
