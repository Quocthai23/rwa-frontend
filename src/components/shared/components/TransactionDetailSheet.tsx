'use client';
import type { ReactNode } from 'react';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import { useTranslation } from 'react-i18next';

/** Shared overlay, width and scrolling for financial entry details. */
export function TransactionDetailSheet({
  open,
  onOpenChange,
  children,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={title ?? t('transactionHistory.title')}
        side="center"
        showCloseButton={false}
        className="bg-background border-border mx-auto w-full max-w-[520px] overflow-hidden rounded-lg border p-0"
      >
        <div className="scrollbar-neutral-slim max-h-[85dvh] overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
