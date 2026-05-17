'use client';

import { SearchLg, UploadCloud02 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/shared/atoms/input';
import { Button } from '@/components/shared/atoms/button';
import AccountDropdown from '@/components/featured/market/components/AccountDropdown';
import MarketTabs from '@/components/featured/market/components/tabs/MarketTabs';
import { useAssetDeploymentStore } from '@/store/useAssetDeploymentStore';
import { useKycStore } from '@/store/useKycStore';
import { useToast } from '@/hook/useToast';
import { useAuthStore } from '@/store/authStore';

export default function MarketAppScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError } = useToast();
  const openDeployment = useAssetDeploymentStore((s) => s.open);
  const openKyc = useKycStore((s) => s.open);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
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

      <Button
        onClick={() => {
          const user = useAuthStore.getState().user;
          if (user?.kycStatus !== 'APPROVED') {
            showError(t('common.error'), t('kyc.required', 'KYC verification is required to deploy assets.'));
            openKyc();
            return;
          }
          openDeployment();
        }}
        className="bg-primary-500 hover:bg-primary-600 fixed right-6 bottom-24 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95"
      >
        <UploadCloud02 size={24} />
      </Button>
    </div>
  );
}
