'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccountStore } from '@/store/useAccountStore';
import { Button } from '@/components/shared/atoms/button';
import { Slider } from '@/components/shared/atoms/slider';
import { useAccountLeverageStore } from '@/store/useAccountLeverageStore';
import { useUpdateAccountLeverage } from '@/hook/useAccount';
import { useToast } from '@/hook/useToast';
import { DEFAULT_ACCOUNT_LEVERAGE, MAX_ACCOUNT_LEVERAGE } from '@/utils/leverage';

const LEVERAGE_MARKS = [1, 50, 100, 150, 200] as const;
const MAX_LEVERAGE_SLIDER = 200;

const clampLeverage = (value: unknown, fallback = DEFAULT_ACCOUNT_LEVERAGE): number => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(MAX_ACCOUNT_LEVERAGE, Math.max(1, parsed));
};

export function LeverageWebContent() {
  const { t } = useTranslation();
  const { accounts, selectedAccount, selectAccount } = useAccountStore();
  const accountLeverageById = useAccountLeverageStore((state) => state.accountLeverageById);
  const setPreferredLeverage = useAccountLeverageStore((state) => state.setPreferredLeverage);
  const updateLeverageMutation = useUpdateAccountLeverage();
  const { showSuccess, showError } = useToast();

  const activeAccount = selectedAccount ?? (accounts.length > 0 ? accounts[0] : null);

  const currentLeverage = useMemo(
    () => clampLeverage(activeAccount?.id ? accountLeverageById[activeAccount.id] : undefined),
    [activeAccount?.id, accountLeverageById],
  );
  const [draftLeverage, setDraftLeverage] = useState(currentLeverage);

  useEffect(() => {
    setDraftLeverage(currentLeverage);
  }, [currentLeverage]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mt-3">
        <div className="bg-background flex w-full gap-2 rounded-t-lg p-1">
          {[accounts[0], accounts[1]].map((acc, idx) => (
            <button
              key={acc?.id || idx}
              className={`flex-1 rounded-t-lg border-b-2 py-2 transition-all duration-150 ${activeAccount?.id === acc?.id ? 'bg-background border-primary-500 text-primary-500 text-body-large-semibold' : 'text-neutral-secondary text-body-large-regular border-transparent bg-transparent'}`}
              style={{ minWidth: 0 }}
              onClick={() => selectAccount(acc)}
              type="button"
            >
              {acc?.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-background mt-4 rounded-lg p-6">
        <div className="flex flex-col gap-5">
          <div className="mb-4 flex w-full items-center justify-between self-stretch">
            <span className="text-body-large-medium text-foreground">
              {t('settings.Leverage', 'Leverage')}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="leverage-btn bg-muted flex items-center justify-center gap-2 rounded-sm p-2 dark:bg-neutral-900"
                onClick={() => setDraftLeverage(clampLeverage(draftLeverage - 1, 1))}
                aria-label="Decrease leverage"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 12H19"
                    stroke="var(--color-neutral-700)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="leverage-value-text min-w-10 text-center">{draftLeverage}x</span>
              <button
                type="button"
                className="leverage-btn bg-muted flex items-center justify-center gap-2 rounded-sm p-2"
                onClick={() => setDraftLeverage(clampLeverage(draftLeverage + 1, 1))}
                aria-label="Increase leverage"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 5V19M5 12H19"
                    stroke="var(--color-neutral-700)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {activeAccount ? (
            <>
              <Slider
                min={1}
                max={MAX_LEVERAGE_SLIDER}
                step={1}
                value={[draftLeverage > MAX_LEVERAGE_SLIDER ? MAX_LEVERAGE_SLIDER : draftLeverage]}
                onValueChange={(values) => {
                  const [rawLeverage] = values;
                  const nextLeverage = clampLeverage(rawLeverage, 1);
                  setDraftLeverage(nextLeverage);
                }}
                className="**:data-[slot=slider-range]:bg-primary-500 *:data-[slot=slider-thumb]:border-primary"
              />

              <div className="relative mt-2 h-6">
                {LEVERAGE_MARKS.map((value, index) => {
                  const percent = ((value - 1) / (MAX_LEVERAGE_SLIDER - 1)) * 100;
                  const getTransform = () => {
                    if (index === 0) return 'translateX(0)';
                    if (index === LEVERAGE_MARKS.length - 1) return 'translateX(-100%)';
                    return 'translateX(-50%)';
                  };
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setDraftLeverage(value)}
                      className="text-neutral-primary leading-md absolute top-0 min-w-0 cursor-pointer border-none bg-transparent p-0 text-center font-sans text-base font-normal"
                      style={{ left: `${percent}%`, transform: getTransform() }}
                    >
                      {value}x
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-body-small-regular text-muted-foreground text-center">
              {t('settings.noAccountsFound', 'No accounts found.')}
            </p>
          )}
        </div>
      </div>

      {activeAccount ? (
        <div className="mt-auto py-4">
          <Button
            disabled={draftLeverage === currentLeverage}
            className={`flex w-full items-center justify-center rounded py-3.5 font-semibold text-white transition-colors ${draftLeverage === currentLeverage ? 'opacity-50' : ''}`}
            variant="primary-contained"
            onClick={() => {
              if (!activeAccount) return;
              if (draftLeverage === currentLeverage) return;

              updateLeverageMutation.mutate(
                { accountId: activeAccount.id, leverage: draftLeverage },
                {
                  onSuccess: () => {
                    setPreferredLeverage(activeAccount.id, draftLeverage);
                    showSuccess(
                      t('settings.saveSuccess', 'Saved'),
                      t('settings.leverageUpdated', 'Leverage updated successfully'),
                    );
                  },
                  onError: (error) => {
                    showError(
                      t('settings.saveError', 'Save failed'),
                      String(error ?? t('settings.saveErrorUnknown', 'Unknown error')),
                    );
                  },
                },
              );
            }}
          >
            {t('common.save', 'Save')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
