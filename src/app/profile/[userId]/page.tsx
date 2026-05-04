'use client';

import { useParams, useRouter } from 'next/navigation';
import { AuthorWall } from '@/components/featured/discover/app/components/wall/AuthorWall';
import Header from '@/components/shared/Header';
import { useAuthStore } from '@/store/authStore';

export default function AuthorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const userId = params?.userId as string;

  const handleOpenAuthorProfile = (authorId: string) => {
    if (authorId !== userId) {
      if (user?.id === authorId) {
        router.push('/news?tab=feed&discoverTab=profile');
      } else {
        router.push(`/profile/${authorId}`);
      }
    }
  };

  return (
    <div className="bg-background flex flex-col p-4">
      <Header label="Author Profile" onBack={() => router.back()} />
      <AuthorWall userId={userId} onOpenAuthorProfile={handleOpenAuthorProfile} />
    </div>
  );
}
