'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AuthorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  useEffect(() => {
    if (userId) {
      router.replace(`/discover?tab=profile?userId=${encodeURIComponent(userId)}`);
    }
  }, [router, userId]);

  return (
    <div className="bg-background flex min-h-[320px] items-center justify-center">
      <div className="border-primary h-7 w-7 animate-spin rounded-full border-2 border-t-transparent" />
    </div>
  );
}
