'use client';

import Image from 'next/image';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { useToast } from '@/hook/useToast';

type DepositMethodProps = {
  onOpenQr: (address: string, network: string) => void;
  onOpenPayos?: () => void;
};

export default function DepositMethod({ onOpenPayos }: DepositMethodProps) {
  const { t } = useTranslation();
  const { showInfo } = useToast();
  const methods = [
    {
      id: 'bank',
      icon: '/assets/images/bank.svg',
      name: t('topUp.bankTransferName'),
      time: t('topUp.bankTransferTime'),
      limit: t('topUp.bankTransferLimit'),
      comingSoon: false,
    },
    {
      id: 'vndt-erc20',
      icon: '/assets/images/tether-1.png',
      name: t('topUp.methods.vndtErc20'),
      time: t('topUp.methods.instantTime15Min'),
      limit: t('topUp.methods.vndtLimit'),
      comingSoon: true,
    },
    {
      id: 'vndt-bep20',
      icon: '/assets/images/tether-2.png',
      name: t('topUp.methods.vndtBep20'),
      time: t('topUp.methods.instantTime15Min'),
      limit: t('topUp.methods.vndtLimit'),
      comingSoon: true,
    },
  ];

  return (
    <div>
      <h3 className="text-h3-semibold border-border text-foreground border-b px-4 py-3">
        {t('topUp.depositTitle')}
      </h3>

      <div className="space-y-2 p-4">
        <Button
          type="button"
          variant="white-contained"
          onClick={() => onOpenPayos?.()}
          className="border-border hover:bg-muted/50 flex w-full items-center border p-4 text-left"
        >
          <div className="bg-muted mr-4 flex size-11 shrink-0 items-center justify-center">
            <Image
              src="/assets/images/bank.svg"
              alt={t('topUp.bankTransferName')}
              width={28}
              height={28}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-large-semibold text-foreground">
              {t('topUp.bankTransferName')}
            </p>
            <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <span>
                {t('topUp.processingTime')}:{' '}
                <b className="text-foreground">{t('topUp.bankTransferTime')}</b>
              </span>
              <span>
                {t('topUp.limit')}:{' '}
                <b className="text-foreground">{t('topUp.bankTransferLimit')}</b>
              </span>
            </div>
          </div>
        </Button>
        {methods.slice(1).map((method) => (
          <Button
            key={method.id}
            type="button"
            variant="white-contained"
            onClick={() =>
              showInfo(t('common.comingSoonTitle'), t('topUp.comingSoonMethodMessage'))
            }
            className="border-border hover:bg-muted/50 flex w-full items-center border p-4 text-left"
          >
            <Image src={method.icon} alt={method.name} width={36} height={36} className="mr-4" />
            <span className="text-foreground flex-1">{method.name}</span>
            <span className="bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 px-2 py-1 text-xs">
              {t('topUp.comingSoonBadge')}
            </span>
          </Button>
        ))}
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          {t('topUp.vndOnlyNotice', {
            defaultValue: 'This platform accepts VND deposits only.',
          })}
        </p>
      </div>
    </div>
  );
}
