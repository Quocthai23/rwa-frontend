'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OpeningOrder } from '@/components/featured/position/app/components/OpeningOrder';
import { useSelectedPositionStore } from '@/store/selectedPositionStore';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import SplashLogo from '@/components/shared/SplashLogo';
import type { Position } from '@/types/position';
import type { OrderItem } from '@/types/orders';

export default function OpeningOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [position, setPosition] = useState<Position | OrderItem | null>(null);
  const [loading, setLoading] = useState(true);

  const tab =
    (searchParams.get('tab') as 'close_position' | 'open_position' | 'modify_order') || undefined;
  const orderType = searchParams.get('orderType') || undefined;
  const symbolFromParams = searchParams.get('symbol');
  const tabBack = searchParams.get('tabBack') || undefined;
  // Get position from store
  const selectedPosition = useSelectedPositionStore((state) => state.selectedPosition);
  const hasHydratedAuth = useAuthHydrated();

  useEffect(() => {
    // If opening new order with symbol in params, no position needed
    if (symbolFromParams) {
      setPosition(null);
      setLoading(false);
      return;
    }

    // If closing/modifying position, position is required
    if (!selectedPosition) {
      setPosition(null);
      setLoading(false);
      return;
    }

    setPosition(selectedPosition);
    setLoading(false);

    // Cleanup: clear position from store when component unmounts
    return () => {
      // Optional: uncomment if you want to clear after leaving the page
      // useSelectedPositionStore.setState({ selectedPosition: null });
    };
  }, [selectedPosition, symbolFromParams]);

  if (!hasHydratedAuth || loading) {
    return <SplashLogo size={300} />;
  }

  return (
    <OpeningOrder
      position={position || undefined}
      tab={tab}
      orderTypeDefault={orderType}
      tabBack={tabBack}
    />
  );
}
