import { ChevronLeft, X } from '@untitledui/icons';

import { Button } from '@/components/shared/atoms/button';

type SheetTopBarProps = {
  title: string;
  onBack?: () => void;
  onClose: () => void;
};

export function SheetTopBar({ title, onBack, onClose }: SheetTopBarProps) {
  return (
    <div className="border-border grid grid-cols-[40px_minmax(0,1fr)_40px] items-center border-b px-4 py-3">
      <div className="flex items-center justify-start">
        {onBack ? (
          <Button variant="white-contained" className="h-10 w-10 p-0" onClick={onBack}>
            <ChevronLeft className="size-6" />
          </Button>
        ) : null}
      </div>
      <div className="text-foreground text-center text-lg font-semibold">{title}</div>
      <div className="flex items-center justify-end">
        <Button variant="white-contained" className="h-10 w-10 p-0" onClick={onClose}>
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}
