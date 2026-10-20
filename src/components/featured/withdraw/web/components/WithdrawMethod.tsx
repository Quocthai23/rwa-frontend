'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { ChevronRight } from '@untitledui/icons';

import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { CHAINS } from '@/constants/chain';
import { useToast } from '@/hook/useToast';
import { useAccountStore } from '@/store/useAccountStore';
import { useTranslation } from 'react-i18next';

export type WithdrawMethodItem = {
  chainId: number;
  comingSoon?: boolean;
  icon: string;
  id: string;
  limit: string;
  name: string;
  processingTime: string;
};

type WithdrawMethodProps = {
  onClose: () => void;
  onSelectMethod?: (method: WithdrawMethodItem) => void;
};

const WithdrawMethod = ({ onClose, onSelectMethod }: WithdrawMethodProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { showError } = useToast();

  const methods: WithdrawMethodItem[] = [
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
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-6 py-5">
        <h2 className="text-h3-semibold text-foreground">{t('features.withdraw')}</h2>
        <p className="text-body-small-regular text-muted-foreground mt-1">
          {t('withdraw.method.selectMethod')}
        </p>
      </div>
      <div className="flex-1 space-y-3 p-6">
        {methods.map((method, index) => (
          <button
            key={`${method.id}-${index}`}
            type="button"
            className={`border-border bg-background hover:border-primary-300 hover:bg-primary-50/30 flex w-full items-center rounded-xl border p-4 text-left transition ${method.comingSoon ? 'opacity-50' : ''}`}
            disabled={method.comingSoon}
            onClick={() => {
              if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
                showError(t('home.withdrawFailedTitle'), t('withdraw.method.demoAccountError'));
                return;
              }
              if (!method.comingSoon) {
                if (onSelectMethod) {
                  onSelectMethod(method);
                  return;
                }
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
                {t('withdraw.method.processingTime')}:{' '}
                <span className="text-body-small-semibold text-foreground">
                  {method.processingTime}
                </span>
              </p>
              <p className="text-body-small-regular text-muted-foreground text-sm">
                {t('withdraw.method.limitLabel')}:{' '}
                <span className="text-body-small-semibold text-foreground">{method.limit}</span>
              </p>
            </div>
            {!method.comingSoon && <ChevronRight className="text-muted-foreground" size={20} />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WithdrawMethod;

