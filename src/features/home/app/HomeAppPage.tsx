'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import AccountInfo from '@/components/featured/home/AccountInfo';
import GuestHomeHeader from '@/components/featured/home/GuestHomeHeader';
import { HomeFeatures } from '@/components/featured/home/HomeFeatures';
import HomeHeader from '@/components/featured/home/HomeHeader';
import MarketTrending from '@/components/featured/home/MarketTrending';
import StrategyNews from '@/components/featured/home/StrategyNews';
import TopRisersFallers from '@/components/featured/home/TopRisersFallers';
import { useAuthStore } from '@/store/authStore';

export function HomeAppPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <AppLayout>
      <div className="bg-background text-foreground flex min-h-screen flex-col">
        {user ? (
          <div>
            <HomeHeader />

            <div className="pb-4">
              <AccountInfo />
              <HomeFeatures />
              <MarketTrending />
              <TopRisersFallers />
              <StrategyNews />
            </div>
          </div>
        ) : (
          <div className="pt-4 pb-8">
            <GuestHomeHeader />
            <HomeFeatures />
            <MarketTrending />
            <TopRisersFallers />
            <StrategyNews />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
