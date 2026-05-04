'use client';

import Image from 'next/image';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';

export type TradeStickyHeaderProps = {
  currentSymbol: string | undefined;
  displaySymbol?: string;
  isOneClickEnabled: boolean;
  isAcceptedTerms: boolean;
  /** Bright limit icon when order/limit mode is active (typically `!isOneClickEnabled`). */
  isLimitOrderVisible?: boolean;
  onOpenSymbolSearch: () => void;
  onLimitOrderClick: () => void;
  onOneClickClick: () => void;
};

export function TradeStickyHeader({
  currentSymbol,
  displaySymbol,
  isOneClickEnabled,
  isAcceptedTerms,
  isLimitOrderVisible = false,
  onOpenSymbolSearch,
  onLimitOrderClick,
  onOneClickClick,
}: TradeStickyHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className={`bg-background sticky top-0 z-50`}>
      <div className="flex justify-between px-4 py-3">
        <div className="flex items-center justify-between" onClick={onOpenSymbolSearch}>
          <div className="flex items-center gap-2">
            <Button variant="white-contained" className="flex items-center gap-1">
              <p className="text-h3-semibold font-semibold">{displaySymbol ?? currentSymbol}</p>
            </Button>
          </div>

          <div>
            <Image
              src="/icons/arrow-down.svg"
              alt={t('trade.a11y.selectSymbol')}
              width={24}
              height={24}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onLimitOrderClick} variant="white-contained" className="p-0">
            <Image
              src={
                isLimitOrderVisible
                  ? '/assets/icons/chart/limitOrder.svg'
                  : '/assets/icons/chart/Limit-order-disable.svg'
              }
              alt={t('trade.a11y.limitOrder')}
              width={24}
              height={24}
            />
          </Button>

          <Button variant="white-contained" className="p-0" onClick={onOneClickClick}>
            {isAcceptedTerms && isOneClickEnabled ? (
              <Image
                src="/assets/icons/chart/oneClick.svg"
                alt={t('trade.a11y.oneClickTrading')}
                width={24}
                height={24}
              />
            ) : (
              <Image
                src="/assets/icons/chart/One-Click-disable.svg"
                alt={t('trade.a11y.oneClickTrading')}
                width={24}
                height={24}
                className="opacity-70"
              />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
