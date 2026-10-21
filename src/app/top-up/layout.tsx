import type { ReactNode } from 'react';
import DemoPaymentRouteGuard from '@/components/shared/trading/DemoPaymentRouteGuard';

export default function LivePaymentLayout({ children }: { children: ReactNode }) {
  return <DemoPaymentRouteGuard>{children}</DemoPaymentRouteGuard>;
}
