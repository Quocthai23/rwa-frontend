type TradePanelActionBarProps = {
  sellLabel: string;
  buyLabel: string;
  isCreatingOrder: boolean;
  isSubmitLocked: boolean;
  sellDisabled: boolean;
  buyDisabled: boolean;
  onSell: () => void;
  onBuy: () => void;
};

export function TradePanelActionBar({
  sellLabel,
  buyLabel,
  isCreatingOrder,
  isSubmitLocked,
  sellDisabled,
  buyDisabled,
  onSell,
  onBuy,
}: TradePanelActionBarProps) {
  return (
    <div className="bg-background border-border border-t px-4 pt-4 pb-6">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={isCreatingOrder || isSubmitLocked || sellDisabled}
          className="flex-1 rounded bg-red-500 px-4 py-3 text-white disabled:opacity-50"
          onClick={onSell}
        >
          <span className="text-lg font-semibold">{sellLabel}</span>
        </button>
        <button
          type="button"
          disabled={isCreatingOrder || isSubmitLocked || buyDisabled}
          className="flex-1 rounded bg-green-500 px-4 py-3 text-white disabled:opacity-50"
          onClick={onBuy}
        >
          <span className="text-md font-semibold">{buyLabel}</span>
        </button>
      </div>
    </div>
  );
}
