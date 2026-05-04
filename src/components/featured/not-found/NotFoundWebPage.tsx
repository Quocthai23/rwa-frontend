'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export function NotFoundWebPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <main className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-2 flex h-full w-full items-center justify-center">
          <Image
            src="/logo/logo.png"
            alt={t('notFound.title', 'Page not found')}
            className="h-30 w-30 object-contain"
            width={120}
            height={120}
          />
        </div>
        <h1 className="text-h2-semibold text-foreground mb-2">
          {t('notFound.title', 'Không tìm thấy trang')}
        </h1>
        <p className="text-body-large-regular text-muted-foreground mb-6">
          {t(
            'notFound.description',
            'Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển đi.',
          )}
        </p>
        <Link
          href="/home"
          className="bg-primary-500 text-body-large-semibold hover:bg-primary-600 inline-flex h-12 items-center justify-center rounded px-6 text-white transition-colors"
        >
          {t('notFound.backToHome', 'Quay về trang chủ')}
        </Link>
      </main>
    </div>
  );
}
