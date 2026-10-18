'use client';

import { use } from 'react';

import { WebLayout } from '@/components/layouts/WebLayout';
import SplashLogo from '@/components/shared/SplashLogo';
import AssetDetailWebScreen, {
  type AssetManagementSection,
} from '@/features/asset-management/web/AssetDetailWebScreen';
import { useAuthHydrated } from '@/hook/useAuthHydrated';

const SECTIONS = new Set<AssetManagementSection>([
  'overview',
  'rental',
  'liquidity',
  'governance',
  'cash-flow',
  'activity',
]);

export default function AssetManagementSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section } = use(params);
  const hydrated = useAuthHydrated();
  if (!hydrated) return <SplashLogo size={300} />;

  const resolvedSection = SECTIONS.has(section as AssetManagementSection)
    ? (section as AssetManagementSection)
    : 'overview';

  return (
    <WebLayout>
      <AssetDetailWebScreen assetId={id} section={resolvedSection} />
    </WebLayout>
  );
}
