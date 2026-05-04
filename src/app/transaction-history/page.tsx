import { Suspense } from 'react';

import TransactionHistory from '@/components/featured/transaction-history/TransactionHistory';

export default function TransactionHistoryPage() {
  return (
    <Suspense fallback={null}>
      <TransactionHistory />
    </Suspense>
  );
}
