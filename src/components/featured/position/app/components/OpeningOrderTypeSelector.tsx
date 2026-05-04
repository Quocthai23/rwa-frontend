import { Check, ChevronDown } from '@untitledui/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { OrderType } from '@/types/orders';

interface OpeningOrderTypeSelectorProps {
  currentOrderType: string;
  isClosePositionTab: boolean;
  isModifyOrder: boolean;
  onSelect: (orderType: string) => void;
}

export default function OpeningOrderTypeSelector({
  currentOrderType,
  isClosePositionTab,
  isModifyOrder,
  onSelect,
}: OpeningOrderTypeSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const getOrderTypeDisplayLabel = (value: string) => {
    if (value === OrderType.MARKET) return t('openingOrder.orderTypeMarketExecution');
    if (value === OrderType.LIMIT) return t('openingOrder.orderTypeLimit');
    if (value === OrderType.STOP) return t('openingOrder.orderTypeStop');
    if (value === OrderType.MODIFY) return t('openingOrder.orderTypeModifyPosition');
    return value;
  };

  const options = [
    { label: OrderType.MARKET },
    { label: OrderType.LIMIT },
    { label: OrderType.STOP },
    ...(isClosePositionTab || isModifyOrder ? [{ label: OrderType.MODIFY }] : []),
  ];

  return (
    <div className="relative mb-3">
      <div
        className="bg-muted flex flex-row items-center justify-between rounded px-4 py-2"
        onClick={() => setShowDropdown((previous) => !previous)}
      >
        <p className="text-body-large-medium text-muted-foreground">{t('openingOrder.type')}</p>
        <button className="flex cursor-pointer flex-row items-center gap-2 border-0 bg-transparent p-0">
          <p className="text-body-large-medium text-foreground">
            {getOrderTypeDisplayLabel(currentOrderType)}
          </p>
          <ChevronDown color={colors.neutral700} size={20} />
        </button>
      </div>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div
            className="border-border bg-background absolute left-0 z-50 mt-1 overflow-hidden rounded-[4px] border py-2"
            style={{
              right: 0,
              top: '100%',
              maxHeight: 300,
            }}
          >
            <div className="overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.label}
                  className="hover:bg-muted w-full cursor-pointer border-0 px-4 py-2 text-left"
                  onClick={() => {
                    onSelect(option.label);
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex flex-row items-start justify-between gap-1">
                    <div className="flex-1">
                      <p
                        className={`text-body-large-medium mb-1 font-semibold ${
                          currentOrderType === option.label ? 'text-primary-500' : 'text-foreground'
                        }`}
                      >
                        {getOrderTypeDisplayLabel(option.label)}
                      </p>
                    </div>
                    {currentOrderType === option.label && (
                      <Check size={20} color={colors.primary500} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
