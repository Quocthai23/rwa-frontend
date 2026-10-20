'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { ChevronRight } from '@untitledui/icons';

import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { CHAINS } from '@/constants/chain';
import { useToast } from '@/hook/useToast';
import { useAccountStore } from '@/store/useAccountStore';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';

type Method = {
  chainId: number;
  comingSoon?: boolean;
  icon: string;
  id: string;
  limit: string;
  name: string;
  processingTime: string;
};

const WithdrawMethod = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { showError } = useToast();

  const methods: Method[] = [
    {
      chainId: CHAINS.sepolia.chainId,
      icon: '/assets/images/tether.png',
      id: 'tether-1',
      limit: t('withdraw.method.limit'),
      name: t('withdraw.method.VND'),
      processingTime: t('withdraw.method.instantTime15Min'),
    },
    {
      chainId: CHAINS.bscTestnet.chainId,
      icon: '/assets/images/tether.png',
      id: 'tether-2',
      limit: t('withdraw.method.limit'),
      name: t('withdraw.method.VND'),
      processingTime: t('withdraw.method.instantTime15Min'),
    },
  ];

  return (
    <div>
      <div className="flex">
        <span className="text-h3-semibold border-border flex-1 border-b px-3 py-2">
          {t('features.withdraw')}
        </span>
      </div>
      <div className="flex-1 p-4">
        {methods.map((method, index) => (
          <button
            key={`${method.id}-${index}`}
            className={`border-border bg-background mb-4 flex w-full items-center rounded-sm border p-4 text-left ${method.comingSoon ? 'opacity-50' : ''}`}
            disabled={method.comingSoon}
            onClick={() => {
              if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
                showError(t('home.withdrawFailedTitle'), t('withdraw.method.demoAccountError'));
                return;
              }
              if (!method.comingSoon) {
                onClose();
                setTimeout(() => {
                  router.push(`/withdraw`);
                }, 100);
              }
            }}
          >
            <div className="relative mr-4 h-10 w-10">
              <Image src={method.icon} alt={method.name} fill className="object-contain" />
              {index === 0 && (
                <span className="bg-card absolute -right-1 -bottom-1 rounded-full p-0.5">
                  <Image
                    src="/assets/images/tether-1.png"
                    alt={t('withdraw.method.VNDErc20Alt')}
                    width={14}
                    height={14}
                  />
                </span>
              )}
              {index === 1 && (
                <span className="bg-card absolute -right-1 -bottom-1 rounded-full p-0.5">
                  <Image
                    src="/assets/images/tether-2.png"
                    alt={t('withdraw.method.VNDBep20Alt')}
                    width={14}
                    height={14}
                  />
                </span>
              )}
            </div>

            <div className="flex-1">
              <p className="text-body-large-semibold text-foreground mb-1">{method.name}</p>
              <p className="text-body-small-regular text-muted-foreground text-sm">
                {t('topUp.processingTime')}:{' '}
                <span className="text-body-large-semibold text-foreground text-sm">
                  {method.processingTime}
                </span>
              </p>
              <p className="text-body-small-regular text-muted-foreground text-sm">
                {t('topUp.limit')}:{' '}
                <span className="text-body-large-semibold text-foreground text-sm">
                  {method.limit}
                </span>
              </p>
            </div>
            {!method.comingSoon && <ChevronRight color={colors.neutral400} size={20} />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WithdrawMethod;

