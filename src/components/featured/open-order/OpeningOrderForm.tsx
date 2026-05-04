'use client';

import { useSearchParams } from 'next/navigation';
import { OpeningOrder } from '@/components/featured/position/app/components/OpeningOrder';
import { useSelectedPositionStore } from '@/store/selectedPositionStore';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import SplashLogo from '@/components/shared/SplashLogo';

export default function OpeningOrderForm() {
  const searchParams = useSearchParams();
  const tab =
    (searchParams.get('tab') as 'close_position' | 'open_position' | 'modify_order') || undefined;
  const orderType = searchParams.get('orderType') || undefined;
  const hasSymbolFromParams = Boolean(searchParams.get('symbol'));
  const tabBack = searchParams.get('tabBack') || undefined;
  const selectedPosition = useSelectedPositionStore((state) => state.selectedPosition);
  const hasHydratedAuth = useAuthHydrated();
  const position = hasSymbolFromParams ? undefined : selectedPosition || undefined;

  if (!hasHydratedAuth) {
    return <SplashLogo size={300} />;
  }

  return (
    <OpeningOrder position={position} tab={tab} orderTypeDefault={orderType} tabBack={tabBack} />
  );
}
