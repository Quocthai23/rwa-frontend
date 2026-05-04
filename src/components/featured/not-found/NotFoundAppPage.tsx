'use client';

import Link from 'next/link';
import Image from 'next/image';

export function NotFoundAppPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <main className="w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-2 flex h-full w-full items-center justify-center">
          <Image
            src="/logo/logo.png"
            alt="Not found"
            className="h-30 w-30 object-contain"
            width={120}
            height={120}
          />
        </div>
        <h1 className="text-h2-semibold text-foreground mb-2">Page not found</h1>
        <p className="text-body-large-regular text-muted-foreground mb-6">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link
          href="/home"
          className="bg-primary-500 text-body-large-semibold hover:bg-primary-600 inline-flex h-12 items-center justify-center rounded px-6 text-white transition-colors"
        >
          Back to Home
        </Link>
      </main>
    </div>
  );
}

export default NotFoundAppPage;
