import OpeningOrderForm from '@/components/featured/open-order/OpeningOrderForm';
import { Suspense } from 'react';

export default function OpeningOrderQueryPage() {
  return (
    <Suspense>
      <OpeningOrderForm />
    </Suspense>
  );
}
