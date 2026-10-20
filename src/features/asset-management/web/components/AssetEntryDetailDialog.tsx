'use client';
import type { ReactNode } from 'react';
import { X } from '@untitledui/icons';
import { TransactionDetailSheet } from '@/components/shared/components/TransactionDetailSheet';
import { AssetManagementButton as Button } from './AssetManagementButton';
import { cn } from '@/lib/utils';

export type AssetEntryDetailField = {
  label: string;
  value: ReactNode;
  wide?: boolean;
  mono?: boolean;
};
type AssetEntryDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  amount?: ReactNode;
  fields: AssetEntryDetailField[];
  metadata?: AssetEntryDetailField[];
  metadataTitle?: string;
  closeLabel: string;
  actions?: ReactNode;
};

export function AssetEntryDetailDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  status,
  amount,
  fields,
  metadata = [],
  metadataTitle,
  closeLabel,
  actions,
}: AssetEntryDetailDialogProps) {
  return (
    <TransactionDetailSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-5 p-4 sm:p-5">
        <header>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{eyebrow}</p>
              <h2 className="text-foreground mt-1 text-lg leading-6 font-semibold">{title}</h2>
            </div>
            <Button
              type="button"
              variant="white-contained"
              className="hover:bg-muted size-8 shrink-0 rounded-full p-0"
              aria-label={closeLabel}
              onClick={() => onOpenChange(false)}
            >
              <X size={18} />
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-xs leading-5">{description}</p>
          {(status || amount) && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {status && (
                <span className="bg-muted text-foreground border-border rounded border px-2 py-1 text-xs font-medium">
                  {status}
                </span>
              )}
              {amount && <strong className="text-foreground text-xl tabular-nums">{amount}</strong>}
            </div>
          )}
        </header>
        <dl className="border-border space-y-3 border-t pt-4">
          {fields.map((field, i) => (
            <DetailField key={`${field.label}-${i}`} field={field} />
          ))}
        </dl>
        {metadata.length > 0 && (
          <section className="border-border border-t pt-4">
            {metadataTitle && (
              <h3 className="text-foreground mb-3 text-sm font-semibold">{metadataTitle}</h3>
            )}
            <dl className="space-y-3">
              {metadata.map((field, i) => (
                <DetailField key={`${field.label}-${i}`} field={field} />
              ))}
            </dl>
          </section>
        )}
        <footer className="border-border flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button type="button" variant="neutral-outline" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </Button>
          {actions}
        </footer>
      </div>
    </TransactionDetailSheet>
  );
}

function DetailField({ field }: { field: AssetEntryDetailField }) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-start justify-between gap-5',
        field.wide && 'flex-col gap-1',
      )}
    >
      <dt className="text-muted-foreground text-sm">{field.label}</dt>
      <dd
        className={cn(
          'text-foreground min-w-0 text-right text-sm font-medium break-words tabular-nums',
          field.mono && 'font-mono text-xs',
          field.wide && 'w-full text-start',
        )}
      >
        {field.value}
      </dd>
    </div>
  );
}
