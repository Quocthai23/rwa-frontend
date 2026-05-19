import { useMemo } from 'react';

import { Minus, Plus } from '@untitledui/icons';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import {
  adjustQuantityByDelta,
  applyQuantityBlur,
  applyQuantityChange,
} from '../utils/tradePanelInputHelpers';
import { t } from 'i18next';

type TradePanelVolumeControlProps = {
  quantity: string;
  setQuantity: (value: string) => void;
  setIsQuantityTouched: (value: boolean) => void;
  minTradeSize: number;
  maxTradeSize: number;
  volumeStep: number;
};

export function TradePanelVolumeControl({
  quantity,
  setQuantity,
  setIsQuantityTouched,
  minTradeSize,
  maxTradeSize,
  volumeStep,
}: TradePanelVolumeControlProps) {
  const quantityStep = useMemo(() => {
    const parsed = Number(volumeStep);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0.01;
  }, [volumeStep]);
  const quantitySuggestionStep = 1;
  const quantityStepLarge = 5;

  const onAdjust = (delta: number) => {
    adjustQuantityByDelta(
      delta,
      quantity,
      setQuantity,
      setIsQuantityTouched,
      minTradeSize,
      maxTradeSize,
      quantityStep,
    );
  };

  return (
    <div className="my-4 px-4">
      <div className="space-y-3">
        <p className="text-body-large-medium text-foreground">
          {t('trade.web.orderForm.quantity')} (Lot)
        </p>
        <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
          <Button
            type="button"
            variant="neutral-contained"
            className="bg-primary-50 text-foreground h-10 w-10 rounded"
            onClick={() => onAdjust(-quantityStep)}
          >
            <Minus size={24} className="text-primary-500 size-6" />
          </Button>
          <Input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => applyQuantityChange(e.target.value, setQuantity, setIsQuantityTouched)}
            placeholder="1"
            onBlur={() =>
              applyQuantityBlur(quantity, setQuantity, minTradeSize, maxTradeSize, quantityStep)
            }
            className="!text-h3-medium text-foreground h-9 border-0 bg-transparent p-0 text-center shadow-none focus-visible:ring-0"
          />
          <Button
            type="button"
            variant="neutral-contained"
            className="bg-primary-50 text-foreground h-10 w-10 rounded"
            onClick={() => onAdjust(quantityStep)}
          >
            <Plus size={24} className="text-primary-500 size-6" />
          </Button>
        </div>
        <div className="text-body-large-medium grid grid-cols-4 gap-2 text-black dark:text-white">
          <Button
            variant="white-contained"
            className="text-body-large-medium border-border h-auto w-full min-w-0 border bg-transparent px-3.25 py-1 text-black hover:bg-transparent dark:text-white"
            onClick={() => onAdjust(-quantityStepLarge)}
          >
            -{quantityStepLarge}
          </Button>
          <Button
            variant="white-contained"
            className="text-body-large-medium border-border h-auto w-full min-w-0 border bg-transparent px-3.25 py-1 text-black hover:bg-transparent dark:text-white"
            onClick={() => onAdjust(-quantitySuggestionStep)}
          >
            -{quantitySuggestionStep}
          </Button>
          <Button
            variant="white-contained"
            className="text-body-large-medium border-border h-auto w-full min-w-0 border bg-transparent px-3.25 py-1 text-black hover:bg-transparent dark:text-white"
            onClick={() => onAdjust(quantitySuggestionStep)}
          >
            +{quantitySuggestionStep}
          </Button>
          <Button
            variant="white-contained"
            className="text-body-large-medium border-border h-auto w-full min-w-0 border bg-transparent px-3.25 py-1 text-black hover:bg-transparent dark:text-white"
            onClick={() => onAdjust(quantityStepLarge)}
          >
            +{quantityStepLarge}
          </Button>
        </div>
      </div>

    </div>
  );
}
