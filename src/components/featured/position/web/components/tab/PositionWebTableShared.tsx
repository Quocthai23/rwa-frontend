'use client';

import { cn } from '@/lib/utils';
import { calcPnLUsd } from '@/components/featured/position/utils/position.calculations';
import { getTPSLPrice, validateTPSL } from '@/components/featured/position/utils/position.validate';
import { updatePosition } from '@/services/positionService';
import { updateOrderAPI } from '@/services/orderService';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hook/useToast';
import { ChevronDown, Minus, Plus, Check } from '@untitledui/icons';
import { Dialog, DialogContent, DialogFooter } from '@/components/shared/atoms/dialog';
import { Button } from '@/components/shared/atoms/button';
import {
  MAX_CHANGE_PERCENT_THRESHOLD,
  TRIGGER_TYPE_OPTIONS,
  TriggerType,
  type TriggerTypeString,
} from '@/types/openingOrder';
import { OrderType } from '@/types/orders';
import { getOrderStatusLabel } from '../../../utils/position.formatters';
import MT5PriceText from '@/components/featured/market/components/MT5PriceText';
import { useTheme } from '@/theme/ThemeProvider';
import Decimal from 'decimal.js';
import { toDecimal } from '@/utils/decimal';
import { useEffect, useId, useMemo, useState } from 'react';
import { ORDER_SIDES, ORDER_TYPE_CODES } from '@/types/orders';
import { LoadingMoreTableSkeleton } from '../../shared/LoadingSkeletons';
import { t } from 'i18next';

export type RtBySymbol = Record<string, { bid: number; ask: number }>;
export type SortDir = 'asc' | 'desc';

export type EstimateContext = {
  side: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES];
  symbol: string;
  quantity: string | number;
  entryPrice: string | number;
  contractSize?: string | number;
  profitCurrency?: string;
  digit?: number;
  pipSize?: string | number;
  rtBySymbol: RtBySymbol;
  id?: string;
  accountId?: string;
  type?: 'position' | 'order';
  orderType?: OrderType;
};

export function mapOrderTypeCodeToOrderType(orderType?: number): OrderType {
  if (orderType === ORDER_TYPE_CODES.LIMIT) return OrderType.LIMIT;
  if (orderType === ORDER_TYPE_CODES.STOP) return OrderType.STOP;
  return OrderType.MARKET;
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', { hour12: false });
}

export function sideLabel(side: number) {
  return side === ORDER_SIDES.BUY ? t('openingOrder.buy') : t('openingOrder.sell');
}

export function formatDecimal(
  value: string | number | null | undefined,
  fallback: string = '-',
  fixed?: number,
): string {
  if (value === null || value === undefined || value === '') return fallback;

  try {
    const decimal = new Decimal(value.toString());

    if (fixed !== undefined) {
      return decimal.toFixed(fixed);
    }

    return decimal.toFixed();
  } catch {
    return fallback;
  }
}
function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <div className="flex w-2 flex-col items-center gap-0.5">
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="currentColor"
        className={cn(
          'transition-colors',
          direction === 'asc' ? 'text-primary-500' : 'text-muted-foreground',
        )}
      >
        <polygon points="4,0 8,5 0,5" />
      </svg>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="currentColor"
        className={cn(
          'transition-colors',
          direction === 'desc' ? 'text-primary-500' : 'text-muted-foreground',
        )}
      >
        <polygon points="4,5 0,0 8,0" />
      </svg>
    </div>
  );
}

export function SortHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDir: SortDir;
  onSort: (key: string) => void;
}) {
  const isActive = currentSortKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-normal whitespace-nowrap transition-colors"
    >
      <span
        className={cn('transition-colors', isActive ? 'text-primary-500' : 'text-muted-foreground')}
      >
        {label}
      </span>
      <SortIcon direction={isActive ? currentSortDir : null} />
    </button>
  );
}

export function EmptyState({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <div className="text-body-small-medium text-muted-foreground border-border flex h-60 w-full items-center justify-center">
      {t('common.no')} {label}
    </div>
  );
}

export function TableLoadingState() {
  return <LoadingMoreTableSkeleton />;
}

export function SidePill({ side }: { side: number }) {
  const isBuy = side === ORDER_SIDES.BUY;
  return (
    <span
      className={cn('text-caption-medium inline-flex', isBuy ? 'text-green-500' : 'text-red-500')}
    >
      {sideLabel(side)}
    </span>
  );
}

export function OrderStatusPill({ status }: { status: number }) {
  const { t } = useTranslation();
  return (
    <span className="text-caption-medium text-foreground inline-flex px-2 py-0.5">
      {getOrderStatusLabel(status, t)}
    </span>
  );
}

export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  sortKey: string | null,
  sortDir: SortDir,
): T[] {
  if (!sortKey) return rows;

  const sorted = [...rows].sort((a, b) => {
    const aVal = a[sortKey as keyof T];
    const bVal = b[sortKey as keyof T];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    const aDec = toDecimal(
      typeof aVal === 'string' || typeof aVal === 'number' ? (aVal as any) : String(aVal),
    );
    const bDec = toDecimal(
      typeof bVal === 'string' || typeof bVal === 'number' ? (bVal as any) : String(bVal),
    );

    if (aDec && bDec) {
      return sortDir === 'asc' ? aDec.cmp(bDec) : bDec.cmp(aDec);
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  return sorted;
}

export function TargetPriceCell({
  value,
  takeProfitValue,
  stopLossValue,
  label,
  estimateContext,
}: {
  value?: string | null;
  takeProfitValue?: string | null;
  stopLossValue?: string | null;
  label: string;
  estimateContext?: EstimateContext;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useTheme();
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();

  const normalizeInputValue = (nextValue?: string | null) => {
    if (!nextValue || nextValue === '-' || nextValue === '--') return '';
    return new Decimal(nextValue).toString();
  };
  const [activeTab, setActiveTab] = useState<'tp' | 'sl'>(label === 'Add TP' ? 'tp' : 'sl');
  const [tpInputValue, setTpInputValue] = useState(
    normalizeInputValue(takeProfitValue ?? (label === 'Add TP' ? value : '')),
  );
  const [slInputValue, setSlInputValue] = useState(
    normalizeInputValue(stopLossValue ?? (label === 'Add SL' ? value : '')),
  );
  const [tpTriggerType, setTpTriggerType] = useState<TriggerTypeString>(TriggerType.PRICE);
  const [slTriggerType, setSlTriggerType] = useState<TriggerTypeString>(TriggerType.PRICE);
  const [showTriggerDropdown, setShowTriggerDropdown] = useState(false);
  const inputId = useId();
  const hasValue = Boolean(value);

  const inputValue = activeTab === 'tp' ? tpInputValue : slInputValue;
  const setInputValue = activeTab === 'tp' ? setTpInputValue : setSlInputValue;
  const triggerType = activeTab === 'tp' ? tpTriggerType : slTriggerType;
  const setTriggerType = activeTab === 'tp' ? setTpTriggerType : setSlTriggerType;

  useEffect(() => {
    setActiveTab(label === 'Add TP' ? 'tp' : 'sl');
  }, [label]);

  useEffect(() => {
    if (!isOpen) {
      setTpInputValue(normalizeInputValue(takeProfitValue ?? (label === 'Add TP' ? value : '')));
      setSlInputValue(normalizeInputValue(stopLossValue ?? (label === 'Add SL' ? value : '')));
    }
  }, [value, label, isOpen, takeProfitValue, stopLossValue]);

  const getTriggerTypeDisplayLabel = (type: TriggerTypeString) => {
    if (type === TriggerType.PRICE) return 'Price';
    if (type === TriggerType.PIPS) return 'Pips';
    if (type === TriggerType.CHANGE_PERCENT) return 'Change %';
    return type;
  };

  const symbolDigit = estimateContext?.digit ?? 2;
  const isModifyType = true;

  const getDefaultValueForTab = (tab: 'tp' | 'sl') => {
    if (tab === 'tp')
      return normalizeInputValue(takeProfitValue ?? (label === 'Add TP' ? value : ''));
    if (tab === 'sl')
      return normalizeInputValue(stopLossValue ?? (label === 'Add SL' ? value : ''));
    return '';
  };

  const getCurrentPrice = () => {
    const entryPriceDecimal = toDecimal(estimateContext?.entryPrice);
    const rt = estimateContext?.rtBySymbol?.[estimateContext?.symbol || ''];
    const realtimePrice = estimateContext?.side === ORDER_SIDES.BUY ? rt?.bid : rt?.ask;

    const realtimeDecimal = toDecimal(realtimePrice as any);
    if (realtimeDecimal && realtimeDecimal.gt(0)) return realtimeDecimal.toNumber();

    if (entryPriceDecimal && entryPriceDecimal.gt(0)) return entryPriceDecimal.toNumber();
    return 0;
  };

  const getIncrementConfig = (type: TriggerTypeString) => {
    if (type === TriggerType.PRICE) {
      return {
        increment: 1 / Math.pow(10, symbolDigit || 1),
        decimalPlaces: symbolDigit || 1,
      };
    }
    if (type === TriggerType.CHANGE_PERCENT) {
      return { increment: 0.1, decimalPlaces: 4 };
    }
    if (type === TriggerType.PIPS) {
      return { increment: 1, decimalPlaces: 0 };
    }
    return { increment: 0.0001, decimalPlaces: 4 };
  };

  const getBaseValue = (type: TriggerTypeString) => {
    if (type === TriggerType.CHANGE_PERCENT || type === TriggerType.PIPS) {
      return 0;
    }
    return getCurrentPrice();
  };

  const handleInputChange = (rawValue: string) => {
    const text = rawValue.replace(/,/g, '.');

    if (text === '') {
      setInputValue('');
      return;
    }

    const isPrice = triggerType === TriggerType.PRICE;
    const isPercent = triggerType === TriggerType.CHANGE_PERCENT;
    const isPips = triggerType === TriggerType.PIPS;
    const canBeNegative = isModifyType && (isPercent || isPips);

    if (text === '-' && canBeNegative) {
      setInputValue('');
      return;
    }

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
    setInputValue(text);
  };

  const formatInputValueByTrigger = (text: string, type: TriggerTypeString): string => {
    if (!text) return '';
    const parsed = Number.parseFloat(text);
    if (!Number.isFinite(parsed)) return '';

    if (type === TriggerType.PRICE) {
      return parsed.toFixed(symbolDigit);
    }

    if (type === TriggerType.CHANGE_PERCENT) {
      return Number.parseFloat(parsed.toFixed(4)).toString();
    }

    if (type === TriggerType.PIPS) {
      return Math.trunc(parsed).toString();
    }

    return parsed.toString();
  };

  const handleInputBlur = () => {
    setInputValue((prev) => formatInputValueByTrigger(prev, triggerType));
  };

  const isConfirmDisabled = useMemo(() => {
    if (!estimateContext?.id || !estimateContext?.accountId) return true;

    const entryPriceDecimal = toDecimal(estimateContext.entryPrice);
    if (!entryPriceDecimal || entryPriceDecimal.lte(0)) return true;
    const entryPrice = entryPriceDecimal.toNumber();

    const takeProfitEnabled = tpInputValue !== '' && Number.isFinite(Number(tpInputValue));
    const stopLossEnabled = slInputValue !== '' && Number.isFinite(Number(slInputValue));

    const exceedChangePercentLimit =
      (takeProfitEnabled &&
        tpTriggerType === TriggerType.CHANGE_PERCENT &&
        Number(tpInputValue) >= MAX_CHANGE_PERCENT_THRESHOLD) ||
      (stopLossEnabled &&
        slTriggerType === TriggerType.CHANGE_PERCENT &&
        Number(slInputValue) >= MAX_CHANGE_PERCENT_THRESHOLD);

    if (exceedChangePercentLimit) return true;

    const realtime = estimateContext.rtBySymbol?.[estimateContext.symbol];
    const bidDecimal = toDecimal(realtime?.bid as any);
    const askDecimal = toDecimal(realtime?.ask as any);
    const normalizedBid = bidDecimal && bidDecimal.gt(0) ? bidDecimal.toNumber() : entryPrice;
    const normalizedAsk = askDecimal && askDecimal.gt(0) ? askDecimal.toNumber() : entryPrice;

    const fallbackPipSize =
      estimateContext.pipSize ??
      (estimateContext.digit != null ? String(10 ** -Number(estimateContext.digit)) : '0.0001');

    const orderType =
      estimateContext.type === 'position'
        ? OrderType.MODIFY
        : (estimateContext.orderType ?? OrderType.MARKET);

    return !validateTPSL(
      estimateContext.side,
      entryPrice,
      normalizedBid,
      normalizedAsk,
      takeProfitEnabled ? Number(tpInputValue) : null,
      stopLossEnabled ? Number(slInputValue) : null,
      orderType,
      tpTriggerType,
      slTriggerType,
      { pipSize: String(fallbackPipSize) } as any,
      estimateContext.type === 'order',
    );
  }, [estimateContext, slInputValue, slTriggerType, tpInputValue, tpTriggerType]);

  const handleSave = async () => {
    try {
      if (isConfirmDisabled) return;

      if (!estimateContext?.id || !estimateContext?.accountId) {
        setIsOpen(false);
        return;
      }

      const entryPriceDecimal = toDecimal(estimateContext.entryPrice);
      if (!entryPriceDecimal || entryPriceDecimal.lte(0)) {
        setIsOpen(false);
        return;
      }

      const entryPrice = entryPriceDecimal.toNumber();

      const side = estimateContext.side;
      const digit = estimateContext.digit ?? 4;

      let convertedTakeProfit: number | null = null;
      if (tpInputValue && Number.isFinite(Number(tpInputValue))) {
        convertedTakeProfit = getTPSLPrice(
          Number(tpInputValue),
          true,
          side,
          tpTriggerType,
          entryPrice,
          { pipSize: estimateContext.pipSize ?? '0.0001' } as any,
        );
      }

      let convertedStopLoss: number | null = null;
      if (slInputValue && Number.isFinite(Number(slInputValue))) {
        convertedStopLoss = getTPSLPrice(
          Number(slInputValue),
          false,
          side,
          slTriggerType,
          entryPrice,
          { pipSize: estimateContext.pipSize ?? '0.0001' } as any,
        );
      }

      if (estimateContext.type === 'order') {
        const orderPayload: any = {};
        orderPayload.takeProfitPrice =
          convertedTakeProfit != null && Number.isFinite(convertedTakeProfit)
            ? convertedTakeProfit.toFixed(digit)
            : null;
        orderPayload.stopLossPrice =
          convertedStopLoss != null && Number.isFinite(convertedStopLoss)
            ? convertedStopLoss.toFixed(digit)
            : null;
        await updateOrderAPI(estimateContext.id, estimateContext.accountId, orderPayload);
      } else {
        const positionPayload: any = {
          accountId: estimateContext.accountId,
        };
        positionPayload.takeProfitPrice =
          convertedTakeProfit != null && Number.isFinite(convertedTakeProfit)
            ? convertedTakeProfit.toFixed(digit)
            : null;
        positionPayload.stopLossPrice =
          convertedStopLoss != null && Number.isFinite(convertedStopLoss)
            ? convertedStopLoss.toFixed(digit)
            : null;
        await updatePosition(estimateContext.id, positionPayload);
      }

      showSuccess(t('common.success'), t('position.modal.updatedTpSlSuccess'));
      setIsOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('common.unknownError');
      showError(t('common.error'), errorMessage);
    }
  };

  const convertedTargetPrice = useMemo(() => {
    if (!estimateContext) return null;
    const rawValue = Number(inputValue);
    if (!Number.isFinite(rawValue)) return null;

    const entryPriceDecimal = toDecimal(estimateContext.entryPrice);
    if (!entryPriceDecimal || entryPriceDecimal.lte(0)) return null;
    const entryPrice = entryPriceDecimal.toNumber();

    const side = estimateContext.side;
    const isTakeProfit = activeTab === 'tp';
    const fallbackPipSize =
      estimateContext.pipSize ??
      (estimateContext.digit != null ? String(10 ** -Number(estimateContext.digit)) : '0.0001');

    return getTPSLPrice(rawValue, isTakeProfit, side, triggerType, entryPrice, {
      pipSize: String(fallbackPipSize),
    } as any);
  }, [activeTab, estimateContext, inputValue, triggerType]);

  const convertedPriceText = useMemo(() => {
    if (convertedTargetPrice == null || !Number.isFinite(convertedTargetPrice)) {
      return '--';
    }
    return convertedTargetPrice.toFixed(symbolDigit);
  }, [convertedTargetPrice, symbolDigit]);

  const estimatedPnlText = useMemo(() => {
    if (!estimateContext) return '--';
    const side = estimateContext.side;
    const quantity = Number(estimateContext.quantity);
    const entryPriceDecimal = toDecimal(estimateContext.entryPrice);
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !entryPriceDecimal ||
      entryPriceDecimal.lte(0)
    ) {
      return '--';
    }
    const entryPrice = entryPriceDecimal.toNumber();

    const targetDecimal = toDecimal(convertedTargetPrice as any);
    if (!targetDecimal || targetDecimal.lte(0)) {
      return '--';
    }

    const pnl = calcPnLUsd({
      side,
      openPrice: entryPrice,
      targetPrice: targetDecimal.toNumber(),
      lotNumber: quantity,
      symbol: estimateContext.symbol,
      rtBySymbol: estimateContext.rtBySymbol,
      contractSize: Number(estimateContext.contractSize ?? 100),
      profitCurrency: estimateContext.profitCurrency ?? 'USD',
    });

    if (pnl == null || !Number.isFinite(pnl)) return '--';
    return `${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}`;
  }, [convertedTargetPrice, estimateContext]);

  const handleMinus = () => {
    try {
      const { increment, decimalPlaces } = getIncrementConfig(triggerType);
      const rawValue = (inputValue ? Number(inputValue) : getBaseValue(triggerType)) - increment;
      const canBeNegative =
        isModifyType &&
        (triggerType === TriggerType.CHANGE_PERCENT || triggerType === TriggerType.PIPS);
      const adjustedValue = canBeNegative ? rawValue : Math.max(0, rawValue);
      const fixedValue = Number.parseFloat(adjustedValue.toFixed(decimalPlaces));
      setInputValue(fixedValue.toString());
    } catch {
      setInputValue('');
    }
  };

  const handlePlus = () => {
    try {
      const { increment, decimalPlaces } = getIncrementConfig(triggerType);
      const newValue = (inputValue ? Number(inputValue) : getBaseValue(triggerType)) + increment;
      const fixedValue = Number.parseFloat(newValue.toFixed(decimalPlaces));
      setInputValue(fixedValue.toString());
    } catch {
      setInputValue('');
    }
  };

  return (
    <>
      <Button
        variant="neutral-outline"
        onClick={() => setIsOpen(true)}
        className={cn(
          'text-caption-regular! hover:bg-muted inline-flex cursor-pointer items-center gap-1 px-2 py-1 transition-colors',
          hasValue
            ? 'border-border bg-muted text-foreground'
            : 'border-border bg-muted text-muted-foreground',
        )}
      >
        <span className="tabular-nums">{hasValue ? formatDecimal(value) : label}</span>
        {hasValue ? <span className="text-muted-foreground">×</span> : null}
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setShowTriggerDropdown(false);
          if (open) {
            setActiveTab(label === 'Add TP' ? 'tp' : 'sl');
          }
        }}
      >
        <DialogContent className="w-90 border-none p-4" showCloseButton={false}>
          <div className="space-y-2">
            {estimateContext && (
              <div className="flex flex-row items-center justify-center gap-4">
                <div className="flex flex-1 justify-center text-center">
                  <MT5PriceText
                    fixedDecimals={estimateContext.digit ?? 2}
                    style={{ color: colors.red500 }}
                    value={Number(estimateContext.rtBySymbol?.[estimateContext.symbol]?.bid) || 0}
                  />
                </div>
                <div className="bg-border h-8 w-px" />
                <div className="flex flex-1 justify-center text-center">
                  <MT5PriceText
                    fixedDecimals={estimateContext.digit ?? 2}
                    style={{ color: colors.green500 }}
                    value={Number(estimateContext.rtBySymbol?.[estimateContext.symbol]?.ask) || 0}
                  />
                </div>
              </div>
            )}

            <div className="border-border flex border-b">
              <button
                className={cn(
                  'text-body-small-medium flex-1 border-b-2 px-4 py-1 text-center transition-colors',
                  activeTab === 'tp'
                    ? 'border-primary-500 text-primary-500'
                    : 'text-muted-foreground border-transparent',
                )}
                onClick={() => {
                  setActiveTab('tp');
                  setShowTriggerDropdown(false);
                }}
              >
                Take Profit
              </button>
              <button
                type="button"
                className={cn(
                  'text-body-small-medium flex-1 border-b-2 px-4 py-1 text-center transition-colors',
                  activeTab === 'sl'
                    ? 'border-primary-500 text-primary-500'
                    : 'text-muted-foreground border-transparent',
                )}
                onClick={() => {
                  setActiveTab('sl');
                  setShowTriggerDropdown(false);
                }}
              >
                Stop Loss
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-body-small-medium text-muted-foreground">
                {estimateContext?.type === 'position' ? 'Entry Price' : 'Price'}
              </p>
              {estimateContext && (
                <p className="text-body-small-medium text-muted-foreground">
                  {formatDecimal(estimateContext.entryPrice)}
                </p>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                className="bg-muted flex w-full items-center justify-between rounded px-4 py-2"
                onClick={() => setShowTriggerDropdown((prev) => !prev)}
              >
                <p className="text-body-small-medium text-foreground">
                  {getTriggerTypeDisplayLabel(triggerType)}
                </p>
                <div className="flex items-center gap-2">
                  <ChevronDown size={18} className="text-muted-foreground" />
                </div>
              </button>

              {showTriggerDropdown && (
                <div className="border-border bg-background absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border py-1">
                  <div className="overflow-y-auto">
                    {TRIGGER_TYPE_OPTIONS.map((option) => {
                      const optionValue = option.label as TriggerTypeString;
                      const isActive = triggerType === optionValue;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          className="bg-background hover:bg-muted w-full cursor-pointer border-0 px-4 py-1.5 text-left"
                          onClick={() => {
                            setTriggerType(optionValue);
                            if (isModifyType && optionValue === TriggerType.PRICE) {
                              setInputValue(getDefaultValueForTab(activeTab));
                            } else {
                              setInputValue('');
                            }
                            setShowTriggerDropdown(false);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <p
                              className={cn(
                                'text-body-small-medium',
                                isActive ? 'text-primary-500!' : 'text-foreground!',
                              )}
                            >
                              {getTriggerTypeDisplayLabel(optionValue)}
                            </p>
                            {isActive && <Check size={16} className="text-primary-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-row items-center gap-2">
              <button
                className="bg-muted flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5"
                onClick={handleMinus}
                type="button"
              >
                <Minus size={18} strokeWidth={2} />
              </button>

              <div className="relative min-w-0 flex-1">
                <input
                  id={inputId}
                  placeholder="not set"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onBlur={handleInputBlur}
                  type="text"
                  inputMode="decimal"
                  className="text-h3-regular text-foreground placeholder:text-muted-foreground w-full rounded-lg px-3 py-2.5 text-center placeholder:text-center focus:ring-0 focus:outline-none"
                />
              </div>

              <button
                className="bg-muted flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5"
                onClick={handlePlus}
                type="button"
              >
                <Plus size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="border-border flex items-center justify-between border-t pt-2">
              <p className="text-caption-regular text-muted-foreground">
                {activeTab === 'tp' ? 'TP' : 'SL'}:{' '}
                <span className="ml-1">{formatDecimal(convertedPriceText)}</span>
              </p>
              <p className="text-caption-regular text-muted-foreground">
                Estimated P/L: {formatDecimal(estimatedPnlText)}
              </p>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="primary-outline"
              onClick={() => setIsOpen(false)}
              className="py-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="py-2"
              disabled={isConfirmDisabled}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
