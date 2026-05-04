import type { ReactNode } from 'react';
import { Minus, Plus } from '@untitledui/icons';
import type { DecimalValue } from '@/types/decimal';

import {
  applyTriggerFieldChange,
  formatTriggerInputOnBlur,
  stepTpSlMinus,
  stepTpSlPlus,
} from '../utils/tradePanelInputHelpers';
import type { TriggerType } from './TradePanelTriggerSelect';

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
      {label && <span className="text-body-large-medium text-foreground mb-2 block">{label}</span>}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="bg-primary-50 text-primary-500 dark:text-primary-200 flex h-10 w-10 items-center justify-center rounded text-lg dark:bg-neutral-800"
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
          <Minus size={24} className="text-primary-500 dark:text-primary-200 size-6" />
        </button>
        <div className="relative flex flex-1 items-center justify-center gap-1">
          <input
            className={`text-h2-medium placeholder:text-muted-foreground w-full min-w-18 rounded bg-transparent text-center outline-none ${
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
          className="bg-primary-50 text-primary-500 dark:text-primary-200 flex h-10 w-10 items-center justify-center rounded text-lg dark:bg-neutral-800"
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
          <Plus size={24} className="text-primary-500 dark:text-primary-200 size-6" />
        </button>
      </div>
    </div>
  );
}
