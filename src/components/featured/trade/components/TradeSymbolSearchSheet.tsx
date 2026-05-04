'use client';

import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import Search from '@/components/featured/search/app/Search';

export type TradeSymbolSearchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasOpened: boolean;
  onOpened: () => void;
  onCancel: () => void;
  onSelectSymbol: (symbol: string) => void;
};

export function TradeSymbolSearchSheet({
  open,
  onOpenChange,
  hasOpened,
  onOpened,
  onCancel,
  onSelectSymbol,
}: TradeSymbolSearchSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) onOpened();
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto h-[80dvh] max-h-[80dvh] w-full max-w-192 gap-0 overflow-hidden p-0"
        showCloseButton={false}
        title=""
      >
        {hasOpened && <Search onCancel={onCancel} onSelectSymbol={onSelectSymbol} isTrade={true} />}
      </SheetContent>
    </Sheet>
  );
}
