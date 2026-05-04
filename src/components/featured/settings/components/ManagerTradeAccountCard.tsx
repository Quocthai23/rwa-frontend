'use client';

import React from 'react';
import { ChevronRight, User01 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';

export function ManagerTradeAccountCard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();

  if (!user) return null;

  return (
    <button
      className="bg-muted hover:bg-border flex w-full flex-row items-center justify-between rounded-lg p-4 transition-colors"
      onClick={() => {
        router.push('/settings/accounts');
      }}
    >
      <div className="flex flex-row items-center">
        <div className="mr-3 flex flex-row">
          <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-pink-100">
            <User01 color={colors.primary500} size={16} />
          </div>
          <div className="bg-muted z-10 -ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white">
            <span className="text-muted-foreground text-xs font-bold">+</span>
          </div>
        </div>
        <span className="text-foreground text-base font-semibold">Manage all accounts</span>
      </div>
      <ChevronRight color={colors.neutral500} size={24} />
    </button>
  );
}
