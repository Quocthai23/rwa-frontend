'use client';
import type { ComponentProps } from 'react';
import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';

export function AssetManagementButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button {...props} className={cn('h-10 rounded-md px-4 py-2 text-sm font-medium', className)} />
  );
}
