import { Minus, Plus } from '@untitledui/icons';

import {
  adjustLimitPriceByStep,
  applyLimitPriceBlur,
  applyLimitPriceTextChange,
} from '../utils/tradePanelInputHelpers';
import type { DecimalValue } from '@/types/decimal';

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
    <div className="flex flex-col items-start justify-between py-3">
      <span className="text-body-small-medium text-foreground pb-2">{priceLabel}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="bg-card text-foreground flex h-9 w-9 items-center justify-center rounded text-lg"
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
          <Minus size={20} className="text-foreground" />
        </button>
        <input
          className={`text-body-large-medium placeholder:text-muted-foreground w-29 min-w-36 rounded bg-transparent text-center outline-none ${
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
          className="bg-card text-foreground flex h-9 w-9 items-center justify-center rounded text-lg"
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
          <Plus size={20} className="text-foreground" />
        </button>
      </div>
    </div>
  );
}
