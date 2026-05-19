import { useMemo } from 'react';

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

  const quantityStepDecimals = useMemo(() => {
    const stepText = quantityStep.toString();
    if (stepText.includes('e-')) {
      return Number.parseInt(stepText.split('e-')[1] ?? '0', 10);
    }
    return stepText.split('.')[1]?.length ?? 0;
  }, [quantityStep]);

  const quantityStepLarge = useMemo(
    () => Number((quantityStep * 5).toFixed(quantityStepDecimals)),
    [quantityStep, quantityStepDecimals],
  );

  const formatQuantityStepLabel = (stepValue: number) =>
    stepValue.toFixed(quantityStepDecimals).replace(/\.?0+$/, '');

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
    <div className="my-5 px-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-button-large-medium text-primary-500 h-9 min-w-12"
          onClick={() => onAdjust(-quantityStepLarge)}
        >
          -{formatQuantityStepLabel(quantityStepLarge)}
        </button>
        <button
          type="button"
          className="text-button-large-medium text-primary-500 h-9 min-w-12"
          onClick={() => onAdjust(-quantityStep)}
        >
          -{formatQuantityStepLabel(quantityStep)}
        </button>
        <input
          className="text-h3-medium w-20 rounded py-2 text-center outline-none"
          inputMode="decimal"
          maxLength={5}
          value={quantity}
          onBlur={() =>
            applyQuantityBlur(quantity, setQuantity, minTradeSize, maxTradeSize, quantityStep)
          }
          onChange={(e) => applyQuantityChange(e.target.value, setQuantity, setIsQuantityTouched)}
        />
        <button
          type="button"
          className="text-button-large-medium text-primary-500 h-9 min-w-12"
          onClick={() => onAdjust(quantityStep)}
        >
          +{formatQuantityStepLabel(quantityStep)}
        </button>
        <button
          type="button"
          className="text-button-large-medium text-primary-500 h-9 min-w-12"
          onClick={() => onAdjust(quantityStepLarge)}
        >
          +{formatQuantityStepLabel(quantityStepLarge)}
        </button>
      </div>

    </div>
  );
}
