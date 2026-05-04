import { Check, ChevronDown } from '@untitledui/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { TRIGGER_TYPE_OPTIONS, TriggerType, type TriggerTypeString } from '@/types/openingOrder';

interface OpeningOrderTriggerSelectorProps {
  currentTriggerType: TriggerTypeString;
  onSelect: (triggerType: TriggerTypeString) => void;
  title?: string;
}

export default function OpeningOrderTriggerSelector({
  currentTriggerType,
  onSelect,
  title,
}: OpeningOrderTriggerSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const getTriggerTypeDisplayLabel = (value: TriggerTypeString) => {
    if (value === TriggerType.PRICE) return t('openingOrder.triggerTypePrice');
    if (value === TriggerType.PIPS) return t('openingOrder.triggerTypePips');
    if (value === TriggerType.CHANGE_PERCENT) return t('openingOrder.triggerTypeChangePercent');
    return value;
  };

  const handleSelect = (triggerType: TriggerTypeString) => {
    onSelect(triggerType);
    setShowDropdown(false);
  };

  return (
    <div className="relative mb-2">
      <div
        className="bg-muted flex flex-row items-center justify-between rounded px-4 py-2"
        onClick={() => setShowDropdown((previous) => !previous)}
      >
        <p className="text-body-large-medium text-muted-foreground">
          {title ?? t('openingOrder.trigger')}
        </p>
        <button className="flex cursor-pointer flex-row items-center gap-2 border-0 bg-transparent p-0">
          <p className="text-body-large-medium text-foreground">
            {getTriggerTypeDisplayLabel(currentTriggerType)}
          </p>
          <ChevronDown color={colors.neutral700} size={20} />
        </button>
      </div>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div
            className="border-border bg-background absolute left-0 z-50 mt-1 overflow-hidden rounded-lg border py-2"
            style={{
              right: 0,
              top: '100%',
              maxHeight: 300,
            }}
          >
            <div className="overflow-y-auto">
              {TRIGGER_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  className="bg-background hover:bg-muted w-full cursor-pointer border-0 px-4 py-2 text-left"
                  onClick={() => handleSelect(option.label as TriggerTypeString)}
                >
                  <div className="flex flex-row items-start justify-between gap-3">
                    <div className="flex-1">
                      <p
                        className={`text-body-large-medium mb-1 font-semibold ${
                          currentTriggerType === option.label
                            ? 'text-primary-500'
                            : 'text-foreground'
                        }`}
                      >
                        {getTriggerTypeDisplayLabel(option.label as TriggerTypeString)}
                      </p>
                    </div>
                    {currentTriggerType === option.label && (
                      <div className="pt-1">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full">
                          <Check size={20} color={colors.primary500} />
                        </div>
                      </div>
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
