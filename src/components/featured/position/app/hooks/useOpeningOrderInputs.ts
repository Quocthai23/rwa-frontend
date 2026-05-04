import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { TriggerType, type TriggerTypeString } from '@/types/openingOrder';

interface UseOpeningOrderInputsParams {
  currentPrice: number;
  isModifyType: boolean;
  limitStopPriceValue: number | null;
  lotDecimalPlaces: number;
  lotText: string;
  maxTradeSize: number;
  minTradeSize: number;
  setLimitStopPriceText: Dispatch<SetStateAction<string>>;
  setLotText: Dispatch<SetStateAction<string>>;
  setStopLossText: Dispatch<SetStateAction<string>>;
  setTakeProfitText: Dispatch<SetStateAction<string>>;
  stopLossValue: number | null;
  symbolDigit: number;
  takeProfitValue: number | null;
  takeProfitTriggerType: TriggerTypeString;
  stopLossTriggerType: TriggerTypeString;
  volumeStep: number;
}

export const useOpeningOrderInputs = ({
  currentPrice,
  isModifyType,
  limitStopPriceValue,
  lotDecimalPlaces,
  lotText,
  maxTradeSize,
  minTradeSize,
  setLimitStopPriceText,
  setLotText,
  setStopLossText,
  setTakeProfitText,
  stopLossValue,
  symbolDigit,
  takeProfitValue,
  takeProfitTriggerType,
  stopLossTriggerType,
  volumeStep,
}: UseOpeningOrderInputsParams) => {
  const getIncrementConfig = useCallback(
    (triggerType: TriggerTypeString, isPrice = false) => {
      let increment = 0.0001;
      let decimalPlaces = 4;

      if (isPrice) {
        increment = 1 / Math.pow(10, symbolDigit || 4);
        decimalPlaces = symbolDigit || 4;
        return { increment, decimalPlaces };
      }

      if (triggerType === TriggerType.PRICE) {
        increment = 1 / Math.pow(10, symbolDigit || 1);
        decimalPlaces = symbolDigit || 1;
      } else if (triggerType === TriggerType.CHANGE_PERCENT) {
        increment = 0.1;
        decimalPlaces = 4;
      } else if (triggerType === TriggerType.PIPS) {
        increment = 1;
        decimalPlaces = 0;
      }

      return { increment, decimalPlaces };
    },
    [symbolDigit],
  );

  const getBaseValue = useCallback(
    (triggerType: TriggerTypeString, isPrice = false) => {
      if (isPrice) {
        return currentPrice;
      }
      if (triggerType === TriggerType.CHANGE_PERCENT || triggerType === TriggerType.PIPS) {
        return 0;
      }
      return currentPrice;
    },
    [currentPrice],
  );

  const handleTakeProfitPlus = useCallback(() => {
    const { increment, decimalPlaces } = getIncrementConfig(takeProfitTriggerType);
    const newValue = (takeProfitValue ?? getBaseValue(takeProfitTriggerType)) + increment;
    const fixedValue = parseFloat(newValue.toFixed(decimalPlaces));
    setTakeProfitText(fixedValue.toString());
  }, [getBaseValue, getIncrementConfig, setTakeProfitText, takeProfitTriggerType, takeProfitValue]);

  const handleTakeProfitMinus = useCallback(() => {
    const { increment, decimalPlaces } = getIncrementConfig(takeProfitTriggerType);
    const rawValue = (takeProfitValue ?? getBaseValue(takeProfitTriggerType)) - increment;
    const canBeNegative =
      isModifyType &&
      (takeProfitTriggerType === TriggerType.CHANGE_PERCENT ||
        takeProfitTriggerType === TriggerType.PIPS);
    const adjustedValue = canBeNegative ? rawValue : Math.max(0, rawValue);
    const fixedValue = parseFloat(adjustedValue.toFixed(decimalPlaces));
    setTakeProfitText(fixedValue.toString());
  }, [
    getBaseValue,
    getIncrementConfig,
    isModifyType,
    setTakeProfitText,
    takeProfitTriggerType,
    takeProfitValue,
  ]);

  const handleStopLossPlus = useCallback(() => {
    const { increment, decimalPlaces } = getIncrementConfig(stopLossTriggerType);
    const newValue = (stopLossValue ?? getBaseValue(stopLossTriggerType)) + increment;
    const fixedValue = parseFloat(newValue.toFixed(decimalPlaces));
    setStopLossText(fixedValue.toString());
  }, [getBaseValue, getIncrementConfig, setStopLossText, stopLossTriggerType, stopLossValue]);

  const handleStopLossMinus = useCallback(() => {
    const { increment, decimalPlaces } = getIncrementConfig(stopLossTriggerType);
    const rawValue = (stopLossValue ?? getBaseValue(stopLossTriggerType)) - increment;
    const canBeNegative =
      isModifyType &&
      (stopLossTriggerType === TriggerType.CHANGE_PERCENT ||
        stopLossTriggerType === TriggerType.PIPS);
    const adjustedValue = canBeNegative ? rawValue : Math.max(0, rawValue);
    const fixedValue = parseFloat(adjustedValue.toFixed(decimalPlaces));
    setStopLossText(fixedValue.toString());
  }, [
    getBaseValue,
    getIncrementConfig,
    isModifyType,
    setStopLossText,
    stopLossTriggerType,
    stopLossValue,
  ]);

  const handleLimitStopPriceMinus = useCallback(() => {
    const { increment, decimalPlaces } = getIncrementConfig(takeProfitTriggerType, true);
    const rawValue = (limitStopPriceValue ?? getBaseValue(takeProfitTriggerType, true)) - increment;
    const adjustedValue = Math.max(0, rawValue);
    const fixedValue = parseFloat(adjustedValue.toFixed(decimalPlaces));
    setLimitStopPriceText(fixedValue.toString());
  }, [
    getBaseValue,
    getIncrementConfig,
    limitStopPriceValue,
    setLimitStopPriceText,
    takeProfitTriggerType,
  ]);

  const handleLimitStopPricePlus = useCallback(() => {
    const { increment, decimalPlaces } = getIncrementConfig(takeProfitTriggerType, true);
    const newValue = (limitStopPriceValue ?? getBaseValue(takeProfitTriggerType, true)) + increment;
    const fixedValue = parseFloat(newValue.toFixed(decimalPlaces));
    setLimitStopPriceText(fixedValue.toString());
  }, [
    getBaseValue,
    getIncrementConfig,
    limitStopPriceValue,
    setLimitStopPriceText,
    takeProfitTriggerType,
  ]);

  const getLotAsNumber = useCallback((): number | null => {
    const parsed = Number.parseFloat(lotText);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [lotText]);

  const getValidCurrentLot = useCallback((): number => {
    const parsed = Number.parseFloat(lotText);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return minTradeSize;
  }, [lotText, minTradeSize]);

  const normalizeLotValue = useCallback(
    (value: number) => {
      const safeValue = Number.isFinite(value) ? value : minTradeSize;
      const clamped = Math.min(maxTradeSize, Math.max(minTradeSize, safeValue));
      return Number.parseFloat(clamped.toFixed(lotDecimalPlaces));
    },
    [lotDecimalPlaces, maxTradeSize, minTradeSize],
  );

  const adjustLotByStep = useCallback(
    (stepMultiplier: number, stepSize?: number) => {
      const currentLot = getValidCurrentLot();
      const resolvedStepSize =
        typeof stepSize === 'number' && Number.isFinite(stepSize) && stepSize > 0
          ? stepSize
          : volumeStep;
      const newValue = normalizeLotValue(currentLot + resolvedStepSize * stepMultiplier);
      setLotText(newValue.toFixed(lotDecimalPlaces));
    },
    [getValidCurrentLot, lotDecimalPlaces, normalizeLotValue, setLotText, volumeStep],
  );

  const handleLotInputChange = useCallback(
    (rawValue: string) => {
      const text = rawValue.replace(/,/g, '.');
      if (text === '') {
        setLotText('');
        return;
      }
      if (text.startsWith('.')) return;
      if (!/^\d*\.?\d*$/.test(text)) return;

      const parts = text.split('.');
      if (parts.length > 2) return;
      if (parts[0].length > 4) return;
      if (parts[1] && parts[1].length > 2) return;

      setLotText(text);
    },
    [setLotText],
  );

  const handleLimitStopPriceInputChange = useCallback(
    (rawValue: string) => {
      const text = rawValue.replace(/,/g, '.');

      if (text === '') {
        setLimitStopPriceText('');
        return;
      }

      if (text.startsWith('-')) return;
      if (text.startsWith('.')) return;

      const regex = new RegExp(`^\\d{0,6}(\\.\\d{0,${symbolDigit}})?$`);
      if (!regex.test(text)) return;

      setLimitStopPriceText(text);
    },
    [setLimitStopPriceText, symbolDigit],
  );

  const handleTakeProfitInputChange = useCallback(
    (rawValue: string) => {
      const text = rawValue.replace(/,/g, '.');

      if (text === '') {
        setTakeProfitText('');
        return;
      }

      const isPrice = takeProfitTriggerType === TriggerType.PRICE;
      const isPercent = takeProfitTriggerType === TriggerType.CHANGE_PERCENT;
      const isPips = takeProfitTriggerType === TriggerType.PIPS;
      const canBeNegative = isModifyType && (isPercent || isPips);

      if (!canBeNegative && text.startsWith('-')) return;
      if (text.startsWith('.')) return;

      let regex: RegExp;
      if (isPrice) {
        regex = new RegExp(`^\\d{0,6}(\\.\\d{0,${symbolDigit}})?$`);
      } else if (isPercent) {
        regex = new RegExp(`^${canBeNegative ? '-?' : ''}\\d{0,2}(\\.\\d{0,4})?$`);
      } else if (isPips) {
        regex = new RegExp(`^${canBeNegative ? '-?' : ''}\\d{0,6}$`);
      } else {
        return;
      }

      if (!regex.test(text)) return;
      setTakeProfitText(text);
    },
    [isModifyType, setTakeProfitText, symbolDigit, takeProfitTriggerType],
  );

  const handleStopLossInputChange = useCallback(
    (rawValue: string) => {
      const text = rawValue.replace(/,/g, '.');

      if (text === '') {
        setStopLossText('');
        return;
      }

      const isPrice = stopLossTriggerType === TriggerType.PRICE;
      const isPercent = stopLossTriggerType === TriggerType.CHANGE_PERCENT;
      const isPips = stopLossTriggerType === TriggerType.PIPS;
      const canBeNegative = isModifyType && (isPercent || isPips);

      if (!canBeNegative && text.startsWith('-')) return;
      if (text.startsWith('.')) return;

      let regex: RegExp;
      if (isPrice) {
        regex = new RegExp(`^\\d{0,6}(\\.\\d{0,${symbolDigit}})?$`);
      } else if (isPercent) {
        regex = new RegExp(`^${canBeNegative ? '-?' : ''}\\d{0,2}(\\.\\d{0,4})?$`);
      } else if (isPips) {
        regex = new RegExp(`^${canBeNegative ? '-?' : ''}\\d{0,6}$`);
      } else {
        return;
      }

      if (!regex.test(text)) return;
      setStopLossText(text);
    },
    [isModifyType, setStopLossText, stopLossTriggerType, symbolDigit],
  );

  return {
    adjustLotByStep,
    handleLimitStopPriceInputChange,
    handleLimitStopPriceMinus,
    handleLimitStopPricePlus,
    handleLotInputChange,
    handleStopLossInputChange,
    handleStopLossMinus,
    handleStopLossPlus,
    handleTakeProfitInputChange,
    handleTakeProfitMinus,
    handleTakeProfitPlus,
    getLotAsNumber,
  };
};
