'use client';

import { SearchLg } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/shared/atoms/input';
import AccountDropdown from '@/components/featured/market/components/AccountDropdown';
import MarketTabs from '@/components/featured/market/components/tabs/MarketTabs';

export default function MarketAppScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="text-foreground flex flex-col overflow-hidden">
      <AccountDropdown />
      <div className="px-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            router.push('/market/search');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              router.push('/market/search');
            }
          }}
          className="bg-background flex w-full items-center gap-1 rounded border border-neutral-200 px-3 py-2 dark:border-neutral-800"
        >
          <SearchLg size={24} className="text-muted-foreground" />
          <Input
            type="text"
            readOnly
            placeholder={t('common.search')}
            className="text-muted-foreground h-auto border-0 !bg-transparent p-0 text-base shadow-none focus-visible:ring-0 dark:!bg-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <MarketTabs />
      </div>
    </div>
  );
}
