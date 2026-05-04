'use client';

import { X } from '@untitledui/icons';

import { Sheet, SheetClose, SheetContent } from '@/components/shared/atoms/web/sheet';
import TopUpActionContent from '../shared/TopUpActionContent';

type TopUpFlowSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function TopUpFlowSheet({ isOpen, onOpenChange }: TopUpFlowSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="center" className="bg-card h-[70%] overflow-y-auto rounded-t-lg">
        <SheetClose className="text-muted-foreground absolute top-8 right-4 z-50 rounded-xs p-0.5">
          <X size={24} strokeWidth={2} />
        </SheetClose>

        <div className="bg-muted mx-auto mt-2 h-1 w-11 rounded" />

        <div className="flex h-full flex-col px-4 pt-2">
          <TopUpActionContent
            onCompleted={() => onOpenChange(false)}
            onNonDemo={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
