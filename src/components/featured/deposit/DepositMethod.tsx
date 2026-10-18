'use client';

import Image from 'next/image';

import { CHAINS } from '@/constants/chain';
import { IS_APP_PRODUCTION } from '@/constants/env';
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

const DepositMethod = ({
  onOpenPayos,
}: {
  onOpenQr: (address: string, network: string) => void;
  onOpenPayos?: () => void;
}) => {
  const { t } = useTranslation();
  const { showInfo } = useToast();
  const ethereumChainId = IS_APP_PRODUCTION
    ? CHAINS.ethereumMainnet.chainId
    : CHAINS.sepolia.chainId;
  const bscChainId = IS_APP_PRODUCTION ? CHAINS.bscMainnet.chainId : CHAINS.bscTestnet.chainId;
  const isPending = false;

  const methods: Method[] = [
    {
      chainId: 0, // 0 for PayOS
      icon: '/assets/images/bank.svg',
      id: 'payos-bank',
      limit: 'Tá»‘i thiá»ƒu 10,000 VND',
      name: 'Chuyá»ƒn khoáº£n NgĂ¢n hĂ ng (VNDT)',
      processingTime: 'Tá»©c thĂ¬ (1-5 phĂºt)',
    },
    {
      chainId: ethereumChainId,
      comingSoon: true,
      icon: '/assets/images/tether.png',
      id: 'tether-1',
      limit: t('topUp.methods.limit'),
      name: t('topUp.methods.tetherErc20'),
      processingTime: t('topUp.methods.instantTime15Min'),
    },
    {
      chainId: bscChainId,
      comingSoon: true,
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
    if (chainId === 0) {
      if (onOpenPayos) onOpenPayos();
      return;
    }
  };

  return (
    <div className="">
      <h3 className="text-h3-semibold border-border text-foreground flex-1 border-b px-3 py-2">
        {t('topUp.depositTitle')}
      </h3>

      <div className="overflow-y-auto p-4">
        {methods.map((method) => {
          const icon =
            method.id === 'tether-1'
              ? '/assets/images/VNDT.svg'
              : method.id === 'tether-2'
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
