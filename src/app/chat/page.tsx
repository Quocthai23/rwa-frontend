import { Suspense } from 'react';
import Chat from '@/components/featured/chat';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}
