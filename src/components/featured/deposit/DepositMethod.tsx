'use client';

import Image from 'next/image';

import { CHAINS } from '@/constants/chain';
import { IS_APP_PRODUCTION } from '@/constants/env';
import { useAccountStore } from '@/store/useAccountStore';
import { useCreateWallet } from '@/hook/payment/useCreateWallet';
import { Button } from '@/components/shared/atoms/button';
import { useToast } from '@/hook/useToast';
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

const DepositMethod = ({ onOpenQr }: { onOpenQr: (address: string, network: string) => void }) => {
  const { t } = useTranslation();
  const { showInfo } = useToast();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const ethereumChainId = IS_APP_PRODUCTION
    ? CHAINS.ethereumMainnet.chainId
    : CHAINS.sepolia.chainId;
  const bscChainId = IS_APP_PRODUCTION ? CHAINS.bscMainnet.chainId : CHAINS.bscTestnet.chainId;
  const { isPending: isCreatingWallet, mutate: createWallet } = useCreateWallet();

  const isPending = isCreatingWallet;

  const methods: Method[] = [
    {
      chainId: ethereumChainId,
      icon: '/assets/images/tether.png',
      id: 'tether-1',
      limit: t('topUp.methods.limit'),
      name: t('topUp.methods.tetherErc20'),
      processingTime: t('topUp.methods.instantTime15Min'),
    },
    {
      chainId: bscChainId,
      icon: '/assets/images/tether.png',
      id: 'tether-2',
      limit: t('topUp.methods.limit'),
      name: t('topUp.methods.tetherBep20'),
      processingTime: t('topUp.methods.instantTime15Min'),
    },
    {
      chainId: bscChainId,
      comingSoon: true,
      icon: '/assets/images/card.svg',
      id: 'card',
      limit: t('topUp.methods.limit'),
      name: t('topUp.methods.card'),
      processingTime: t('topUp.methods.instantTime2Min'),
    },
  ];

  const handleSelectMethod = (chainId: number, comingSoon?: boolean) => {
    if (comingSoon) {
      showInfo(t('common.comingSoonTitle'), t('topUp.comingSoonMethodMessage'));
      return;
    }
    handleCreateWallet(chainId);
  };

  const handleCreateWallet = (chainId: number) => {
    if (!selectedAccount) return;

    createWallet(
      {
        address: '',  // Will be filled after wallet creation — address is returned by BE
        chainId: String(chainId),
        type: 'EVM',
      },
      {
        onSuccess: (data) => {
          onOpenQr(data.wallet.address, String(chainId));
        },
      },
    );
  };

  return (
    <div className="">
      <h3 className="text-h3-semibold border-border text-foreground flex-1 border-b px-3 py-2">
        {t('topUp.depositTitle')}
      </h3>

      <div className="overflow-y-auto p-4">
        {methods.map((method, index) => {
          const icon =
            index === 0
              ? '/assets/images/usdt.svg'
              : index === 1
                ? '/assets/images/usdc.svg'
                : method.icon;

          return (
            <Button
              key={method.id}
              variant="white-contained"
              disabled={isPending}
              onClick={() => handleSelectMethod(method.chainId, method.comingSoon)}
              className={`border-border mb-4 flex w-full items-center rounded-sm border p-4 text-left ${isPending ? 'opacity-50' : ''}`}
            >
              <div className="mr-4">
                <Image src={icon} alt={method.name} width={40} height={40} />
              </div>

              <div className="flex-1">
                <div className="flex items-center">
                  <span className="text-body-large-semibold text-foreground mr-2">
                    {method.name}
                  </span>

                  {method.comingSoon && (
                    <span className="bg-primary-50 text-primary-500 rounded px-2 py-0.5 text-xs">
                      {t('topUp.comingSoonBadge')}
                    </span>
                  )}
                </div>

                <p className="mt-1">
                  <span className="text-body-small-regular text-muted-foreground">
                    {t('topUp.processingTime')}:{' '}
                  </span>
                  <span className="text-body-small-semibold text-foreground">
                    {method.processingTime}
                  </span>
                </p>

                <p className="mt-1">
                  <span className="text-body-small-regular text-muted-foreground">
                    {t('topUp.limit')}:{' '}
                  </span>
                  <span className="text-body-small-semibold text-foreground">{method.limit}</span>
                </p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default DepositMethod;
