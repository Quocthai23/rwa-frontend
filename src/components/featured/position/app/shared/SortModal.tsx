'use client';

import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Check } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortOption {
  label: string;
  value: string | null;
}

export interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  options: SortOption[];
  selectedSort: string | null;
  selectedDirection: SortDirection;
  onSort: (field: string | null, direction: SortDirection) => void;
  title?: string;
}

function SortModal({
  visible,
  onClose,
  options,
  selectedSort,
  selectedDirection,
  onSort,
  title = 'Sort by',
}: SortModalProps) {
  const { t } = useTranslation();
  const resolvedTitle = title === 'Sort by' ? t('position.modal.sortBy') : title;
  const handleOptionPress = (option: SortOption) => {
    // Default option (value is null) - reset sort
    if (option.value === null) {
      onSort(null, null);
      return;
    }

    // Same field pressed again - toggle direction
    if (selectedSort === option.value) {
      const newDirection = selectedDirection === 'desc' ? 'asc' : 'desc';
      onSort(option.value, newDirection);
    } else {
      // New field pressed - start with descending
      onSort(option.value, 'desc');
    }
  };

  const renderDirectionIcon = (option: SortOption) => {
    // Show checkmark for Default option when no sort is active
    if (option.value === null) {
      if (selectedSort === null && selectedDirection === null) {
        return <Check className="text-primary-500" size={18} />;
      }
      return null;
    }

    if (selectedSort !== option.value) return null;

    if (selectedDirection === 'desc') {
      return <ArrowDown className="text-primary-500" size={18} />;
    } else if (selectedDirection === 'asc') {
      return <ArrowUp className="text-primary-500" size={18} />;
    } else {
      return <Check className="text-primary-500" size={18} />;
    }
  };

  if (!visible) return null;

  return (
    <Sheet open={visible} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        title={resolvedTitle}
        className="bg-background text-foreground mx-auto w-full max-w-192 rounded-t-lg"
      >
        {/* Header */}
        <div className="border-border border-b p-4">
          <h2 className="text-foreground text-lg font-semibold">{resolvedTitle}</h2>
        </div>

        {/* Options */}
        <div className="mb-3">
          {options.map((option) => (
            <button
              key={option.value ?? `default-${option.label}`}
              onClick={() => handleOptionPress(option)}
              className={cn(
                'flex w-full items-center justify-between px-4 py-3 text-left',
                'hover:bg-muted transition-colors',
                selectedSort === option.value ||
                  (option.value === null && selectedSort === null && selectedDirection === null)
                  ? 'text-primary-500'
                  : 'text-foreground',
              )}
            >
              <span className="text-base font-normal">{option.label}</span>
              {renderDirectionIcon(option)}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SortModal;
