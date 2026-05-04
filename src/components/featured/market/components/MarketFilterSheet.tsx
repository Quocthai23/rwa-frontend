import { Check } from '@untitledui/icons';
import { useEffect, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Switch } from '@/components/shared/atoms/switch';
import { useTranslation } from 'react-i18next';

type CategoryOption = {
  readonly id: string;
  readonly option: string;
  readonly optionKey?: string;
};

type StatusOption = {
  readonly id: string;
  readonly option: string;
  readonly optionKey?: string;
};

type MarketFilterSheetProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;

  readonly onlyFavorite: boolean;
  readonly onToggleOnlyFavorite: (next: boolean) => void;

  readonly categoryFilter: string[];
  readonly onChangeCategoryFilter: (next: string[]) => void;

  readonly categoryStatus: StatusOption;
  readonly onChangeCategoryStatus: (next: StatusOption) => void;

  readonly categoryOptions: readonly CategoryOption[];
  readonly statusOptions: readonly StatusOption[];
};

export default function MarketFilterSheet({
  open,
  onOpenChange,
  onlyFavorite,
  onToggleOnlyFavorite,
  categoryFilter,
  onChangeCategoryFilter,
  categoryStatus,
  onChangeCategoryStatus,
  categoryOptions,
  statusOptions,
}: MarketFilterSheetProps) {
  const { t } = useTranslation();
  const [pendingOnlyFavorite, setPendingOnlyFavorite] = useState(onlyFavorite);
  const [pendingCategoryFilter, setPendingCategoryFilter] = useState<string[]>(categoryFilter);
  const [pendingCategoryStatus, setPendingCategoryStatus] = useState<StatusOption>(categoryStatus);

  useEffect(() => {
    if (open) {
      setPendingOnlyFavorite(onlyFavorite);
      setPendingCategoryFilter(categoryFilter);
      setPendingCategoryStatus(categoryStatus);
    }
  }, [open, onlyFavorite, categoryFilter, categoryStatus]);

  const handleApply = () => {
    onToggleOnlyFavorite(pendingOnlyFavorite);
    onChangeCategoryFilter(pendingCategoryFilter);
    onChangeCategoryStatus(pendingCategoryStatus);
    onOpenChange(false);
  };

  const isApplyDisabled = pendingCategoryFilter.length === 0;

  const isAllSelected = pendingCategoryFilter.includes('all');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-sheet max-h-[85vh] overflow-y-auto p-0"
        showCloseButton={false}
      >
        <div className="pt-2 pb-10">
          <p className="text-h3-semibold border-border text-foreground border-b border-neutral-200 px-4 py-4 dark:border-neutral-900">
            {t('market.filter')}
          </p>

          <div className="mt-4 space-y-6 px-4">
            <div className="flex items-center justify-between">
              <span className="text-button-large-semibold text-foreground">
                {t('market.onlyFavourite')}
              </span>
              <Switch
                checked={pendingOnlyFavorite}
                onCheckedChange={setPendingOnlyFavorite}
                aria-label={t('market.toggleOnlyFavourite')}
              />
            </div>

            <div>
              <p className="text-button-large-semibold text-foreground mb-3">
                {t('market.categories')}
              </p>
              <div className="space-y-2">
                {categoryOptions.map((category) => {
                  const isSelected =
                    category.id === 'all'
                      ? isAllSelected
                      : isAllSelected || pendingCategoryFilter.includes(category.id);

                  return (
                    <button
                      type="button"
                      key={category.id}
                      disabled={isAllSelected && category.id !== 'all'}
                      className={`flex w-full items-center justify-between py-2 ${
                        isAllSelected && category.id !== 'all'
                          ? 'cursor-not-allowed opacity-50'
                          : ''
                      }`}
                      onClick={() => {
                        if (category.id === 'all') {
                          if (isAllSelected) {
                            setPendingCategoryFilter([]);
                          } else {
                            setPendingCategoryFilter(['all']);
                          }
                          return;
                        }

                        if (isAllSelected) return;

                        const next = pendingCategoryFilter.includes(category.id)
                          ? pendingCategoryFilter.filter((id) => id !== category.id)
                          : [...pendingCategoryFilter, category.id];

                        setPendingCategoryFilter(next);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-[3px] border ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'bg-background border-neutral-300'
                          }`}
                        >
                          {isSelected && <Check className="text-white" size={24} />}
                        </span>
                        <span className="text-body-large-medium text-foreground">
                          {category.optionKey ? t(category.optionKey) : category.option}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {statusOptions && statusOptions.length > 0 && (
              <div>
                <p className="text-button-large-semibold text-foreground mb-4">
                  {t('market.status')}
                </p>
                <div className="space-y-2">
                  {statusOptions.map((category) => {
                    const isSelected = pendingCategoryStatus.id === category.id;
                    return (
                      <button
                        type="button"
                        key={category.id}
                        className="flex w-full items-center justify-between py-2"
                        onClick={() => setPendingCategoryStatus(category)}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                              isSelected ? 'border-primary-500' : 'border-neutral-300'
                            }`}
                          >
                            {isSelected && <span className="bg-primary-500 h-3 w-3 rounded-full" />}
                          </span>
                          <span className="text-body-large-medium text-foreground">
                            {category.optionKey ? t(category.optionKey) : category.option}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="my-5 flex gap-4 px-4">
            <Button
              variant="white-outline"
              className="bg-muted h-10 flex-1 border-none"
              onClick={() => onOpenChange(false)}
            >
              <span className="text-button-large-medium text-foreground py-3">
                {t('common.cancel')}
              </span>
            </Button>
            <Button
              variant="primary-contained"
              className="h-10 flex-1"
              onClick={handleApply}
              disabled={isApplyDisabled}
            >
              <span className="text-button-large-medium py-3 text-white">
                {t('transactionHistory.apply')}
              </span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
