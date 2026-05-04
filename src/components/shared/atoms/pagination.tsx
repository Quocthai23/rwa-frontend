import * as React from 'react';
import { ChevronLeft, ChevronRight, DotsHorizontal } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/shared/atoms/button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  const { t } = useTranslation();

  return (
    <nav
      role="navigation"
      aria-label={t('common.pagination.label')}
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  size?: 'icon' | 'default';
} & React.ComponentProps<'a'>;

function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'neutral-outline' : 'neutral-ghost',
        }),
        size === 'icon' ? 'size-9 p-0' : 'h-9 px-3',
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  const { t } = useTranslation();

  return (
    <PaginationLink
      aria-label={t('common.pagination.goToPreviousPage')}
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeft />
      <span className="hidden sm:block">{t('common.pagination.previous')}</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  const { t } = useTranslation();

  return (
    <PaginationLink
      aria-label={t('common.pagination.goToNextPage')}
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">{t('common.pagination.next')}</span>
      <ChevronRight />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  const { t } = useTranslation();

  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <DotsHorizontal className="size-4" />
      <span className="sr-only">{t('common.pagination.morePages')}</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
