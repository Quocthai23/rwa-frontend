'use client';

import { use } from 'react';

import { WebLayout } from '@/components/layouts/WebLayout';
import SplashLogo from '@/components/shared/SplashLogo';
import RentalListingDetailScreen from '@/features/rentals/web/RentalListingDetailScreen';
import { useAuthHydrated } from '@/hook/useAuthHydrated';

export default function RentalListingPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const hydrated = useAuthHydrated();

  if (!hydrated) return <SplashLogo size={300} />;

  return (
    <WebLayout>
      <RentalListingDetailScreen assetId={assetId} />
    </WebLayout>
  );
}
