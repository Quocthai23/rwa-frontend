import type { ReactNode } from 'react';
import { Minus, Plus } from '@untitledui/icons';

import {
  applyTriggerFieldChange,
  formatTriggerInputOnBlur,
  stepTpSlMinus,
  stepTpSlPlus,
} from '../utils/tradePanelInputHelpers';
import type { TriggerType } from './TradePanelTriggerSelect';
import type { DecimalValue } from '@/types/decimal';

type TradePanelTpSlInputRowProps = {
  label?: ReactNode;
  notSetLabel: string;
  value: string;
  setValue: (value: string) => void;
  triggerType: TriggerType;
  symbolDigit: number;
  transactionType: 'buy' | 'sell';
  sellPrice: DecimalValue;
  buyPrice: DecimalValue;
  className?: string;
};

export function TradePanelTpSlInputRow({
  label,
  notSetLabel,
  value,
  setValue,
  triggerType,
  symbolDigit,
  transactionType,
  sellPrice,
  buyPrice,
  className = '',
}: TradePanelTpSlInputRowProps) {
  return (
    <div className={`py-3 ${className}`.trim()}>
      {label && <span className="text-body-small-medium text-foreground mb-2 block">{label}</span>}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="bg-card text-foreground flex h-9 w-9 items-center justify-center rounded text-lg"
          onClick={() =>
            stepTpSlMinus(
              setValue,
              value,
              triggerType,
              symbolDigit,
              transactionType,
              sellPrice,
              buyPrice,
            )
          }
        >
          <Minus size={20} className="text-foreground" />
        </button>
        <div className="relative flex flex-1 items-center justify-center gap-1">
          <input
            className={`text-body-large-medium placeholder:text-muted-foreground w-full min-w-18 rounded bg-transparent text-center outline-none ${
              value && value !== '0.00' ? 'text-foreground' : 'text-muted-foreground'
            }`}
            inputMode="decimal"
            maxLength={triggerType === 'pips' ? 6 : triggerType === 'changePercent' ? 7 : undefined}
            placeholder={triggerType === 'changePercent' ? '0' : notSetLabel}
            value={value}
            onBlur={() => {
              if (!value) return;
              setValue(formatTriggerInputOnBlur(triggerType, value, symbolDigit));
            }}
            onChange={(e) =>
              applyTriggerFieldChange(setValue, e.target.value, triggerType, symbolDigit)
            }
          />
        </div>
        <button
          type="button"
          className="bg-card text-foreground flex h-9 w-9 items-center justify-center rounded text-lg"
          onClick={() =>
            stepTpSlPlus(
              setValue,
              value,
              triggerType,
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
