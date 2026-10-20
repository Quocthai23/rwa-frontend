'use client';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import { KycVerificationFlow } from '../KycVerificationFlow';
export function KycFlowSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="center"
        showCloseButton={false}
        className="bg-background border-border w-[calc(100vw-24px)] max-w-3xl overflow-hidden rounded-2xl border p-0"
      >
        <KycVerificationFlow onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
