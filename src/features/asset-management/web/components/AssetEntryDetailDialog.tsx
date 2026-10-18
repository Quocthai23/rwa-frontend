'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/shared/atoms/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/atoms/dialog';
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
  fields: AssetEntryDetailField[];
  metadata?: AssetEntryDetailField[];
  metadataTitle?: string;
  closeLabel: string;
};

export function AssetEntryDetailDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  status,
  fields,
  metadata = [],
  metadataTitle,
  closeLabel,
}: AssetEntryDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="border-border bg-card max-h-[calc(100vh-2rem)] gap-0 overflow-y-auto rounded-md p-0 shadow-xl sm:max-w-2xl"
      >
        <DialogHeader className="border-border border-b px-5 py-5 text-left sm:px-6">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 pr-8 text-[11px] font-semibold tracking-wide uppercase">
            <span className="text-primary">{eyebrow}</span>
            {status ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-foreground">{status}</span>
              </>
            ) : null}
          </div>
          <DialogTitle className="text-foreground mt-2 text-xl leading-tight">{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <dl className="border-border grid border-y sm:grid-cols-2">
            {fields.map((field, index) => (
              <DetailField key={`${field.label}-${index}`} field={field} />
            ))}
          </dl>

          {metadata.length > 0 ? (
            <section className="border-border border-t pt-5">
              {metadataTitle ? (
                <h3 className="text-foreground mb-3 text-sm font-semibold">{metadataTitle}</h3>
              ) : null}
              <dl className="border-border grid border-y sm:grid-cols-2">
                {metadata.map((field, index) => (
                  <DetailField key={`${field.label}-${index}`} field={field} />
                ))}
              </dl>
            </section>
          ) : null}

          <div className="flex justify-end pt-1">
            <DialogClose asChild>
              <Button type="button" variant="neutral-outline" className="min-w-24 rounded-md">
                {closeLabel}
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ field }: { field: AssetEntryDetailField }) {
  return (
    <div
      className={cn(
        'border-border min-w-0 border-b px-1 py-3.5 last:border-b-0 sm:px-3 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0',
        field.wide && 'sm:col-span-2',
      )}
    >
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {field.label}
      </dt>
      <dd
        className={cn(
          'text-foreground mt-1.5 min-w-0 text-sm font-medium break-words tabular-nums',
          field.mono && 'font-mono text-xs',
        )}
      >
        {field.value}
      </dd>
    </div>
  );
}
