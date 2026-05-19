import type { DecimalValue } from '@/types/decimal';

type TradePanelSymbolHeaderProps = {
  symbol: string;
  descSymbol: string;
  sellPrice: DecimalValue;
  buyPrice: DecimalValue;
  formatQuote: (value: DecimalValue) => string;
};

export function TradePanelSymbolHeader({
  symbol,
  descSymbol,
  sellPrice,
  buyPrice,
  formatQuote,
}: TradePanelSymbolHeaderProps) {
  return (
    <div className="mb-4 flex w-full items-center justify-between px-4">
      <div className="w-1/2">
        <div className="flex items-center gap-2">
          <p className="text-h3-semibold">{symbol}</p>
        </div>
        <div className="text-body-small-regular text-muted-foreground">{descSymbol}</div>
      </div>
      <div className="flex w-1/2 flex-col items-end gap-1">
        <div className="flex w-full items-baseline gap-3 text-right">
          <span className="text-body-large-semibold w-1/2 text-center text-red-500">
            {formatQuote(sellPrice)}
          </span>
          <span className="text-body-large-semibold w-1/2 text-center text-green-500">
            {formatQuote(buyPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
