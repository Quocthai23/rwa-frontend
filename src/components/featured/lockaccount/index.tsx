'use client';

import { ChevronLeft, AlertTriangle } from '@untitledui/icons';
import { useRouter } from 'next/navigation';

const LOCK_CONSEQUENCES = [
  'Terminate all ongoing withdrawal and verification option change requests',
  'Log out all devices and suspend login, trading, and API functions',
  'Restrict API key usage',
  'Remove all trusted devices',
];

export default function LockAccount() {
  const router = useRouter();

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <div className="bg-background relative sticky top-0 z-10 flex h-14 items-center justify-center">
        <button onClick={() => router.back()} className="absolute left-4 p-1">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-6">
        {/* Icon */}
        <div className="mt-10 mb-6 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="text-red-500" size={28} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-foreground mb-6 text-center text-2xl font-bold">Lock your account?</h1>

        {/* Description */}
        <p className="text-muted-foreground mb-4 text-base">
          If you suspect your account is compromised, you can immediately lock it to prevent asset
          theft.
          <br />
          Locking will result in the following:
        </p>

        {/* Bullet points */}
        <div className="mb-4 ml-2">
          {LOCK_CONSEQUENCES.map((item) => (
            <div key={item} className="mb-3 flex flex-row">
              <span className="text-foreground mr-2 text-base">•</span>
              <span className="text-foreground flex-1 text-base">{item}</span>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Lock Button */}
        <div className="mb-6">
          <button className="flex w-full items-center justify-center rounded bg-red-500 py-4 font-semibold text-white transition-colors hover:bg-red-600">
            Lock account
          </button>
        </div>
      </div>
    </div>
  );
}
