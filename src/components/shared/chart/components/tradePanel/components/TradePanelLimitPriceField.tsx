import { Minus, Plus } from '@untitledui/icons';
import type { DecimalValue } from '@/types/decimal';

import {
  adjustLimitPriceByStep,
  applyLimitPriceBlur,
  applyLimitPriceTextChange,
} from '../utils/tradePanelInputHelpers';

type TradePanelLimitPriceFieldProps = {
  priceLabel: string;
  notSetLabel: string;
  limitPrice: string;
  setLimitPrice: (value: string) => void;
  symbolDigit: number;
  transactionType: 'buy' | 'sell';
  sellPrice: DecimalValue;
  buyPrice: DecimalValue;
};

export function TradePanelLimitPriceField({
  priceLabel,
  notSetLabel,
  limitPrice,
  setLimitPrice,
  symbolDigit,
  transactionType,
  sellPrice,
  buyPrice,
}: TradePanelLimitPriceFieldProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-body-large-medium text-foreground">{priceLabel}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="bg-primary-50 text-primary-500 dark:text-primary-200 flex h-8 w-8 items-center justify-center rounded text-lg dark:bg-neutral-800"
          onClick={() =>
            adjustLimitPriceByStep(
              -1,
              limitPrice,
              setLimitPrice,
              symbolDigit,
              transactionType,
              sellPrice,
              buyPrice,
            )
          }
        >
          <Minus size={24} className="text-primary-500 dark:text-primary-200 size-6" />
        </button>
        <input
          className={`text-body-large-medium placeholder:text-muted-foreground w-29 min-w-18 rounded bg-transparent text-center outline-none ${
            limitPrice ? 'text-foreground' : 'text-primary-500'
          }`}
          inputMode="decimal"
          placeholder={notSetLabel}
          value={limitPrice}
          onBlur={() => applyLimitPriceBlur(limitPrice, setLimitPrice, symbolDigit)}
          onChange={(e) => applyLimitPriceTextChange(setLimitPrice, e.target.value, symbolDigit)}
        />
        <button
          type="button"
          className="bg-primary-50 text-primary-500 dark:text-primary-200 flex h-8 w-8 items-center justify-center rounded text-lg dark:bg-neutral-800"
          onClick={() =>
            adjustLimitPriceByStep(
              1,
              limitPrice,
              setLimitPrice,
              symbolDigit,
              transactionType,
              sellPrice,
              buyPrice,
            )
          }
        >
          <Plus size={24} className="text-primary-500 dark:text-primary-200 size-6" />
        </button>
      </div>
    </div>
  );
}

