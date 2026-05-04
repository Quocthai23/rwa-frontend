'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/atoms/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

export type DataTableSortDirection = 'asc' | 'desc';

export type DataTableSortState<K extends string> = {
  column: K;
  direction: DataTableSortDirection;
};

export type DataTableColumn<T, K extends string> = {
  align?: 'left' | 'right';
  cellClassName?: string | ((row: T) => string);
  key: K;
  label: ReactNode;
  renderCell: (row: T) => ReactNode;
  sortable?: boolean;
  widthClass?: string;
};

type DataTableProps<T, K extends string> = {
  columns: Array<DataTableColumn<T, K>>;
  data: T[];
  emptyContent?: ReactNode;
  headerCellClassName?: string;
  headerRowClassName?: string;
  loading?: boolean;
  loadingRowCount?: number;
  onRowClick?: (row: T) => void;
  onSortChange?: (next: DataTableSortState<K>) => void;
  rowClassName?: string;
  rowKey: (row: T, index: number) => string;
  sortState?: DataTableSortState<K>;
  tableClassName?: string;
};

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <div className="flex h-5 scale-50 flex-col items-center justify-center gap-0">
      <svg
        width="5"
        height="5"
        viewBox="0 0 8 5"
        fill="currentColor"
        className={direction === 'asc' ? 'text-primary-500' : 'text-muted-foreground'}
      >
        <polygon points="4,0 8,5 0,5" />
      </svg>
      <svg
        width="5"
        height="5"
        viewBox="0 0 8 5"
        fill="currentColor"
        className={direction === 'desc' ? 'text-primary-500' : 'text-muted-foreground'}
      >
        <polygon points="4,5 0,0 8,0" />
      </svg>
    </div>
  );
}

export function DataTable<T, K extends string>({
  columns,
  data,
  emptyContent,
  headerCellClassName,
  headerRowClassName,
  loading = false,
  loadingRowCount = 8,
  onRowClick,
  onSortChange,
  rowClassName,
  rowKey,
  sortState,
  tableClassName,
}: DataTableProps<T, K>) {
  const handleSort = (column: K) => {
    if (!onSortChange) return;

    const direction =
      sortState?.column === column && sortState.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column, direction });
  };

  return (
    <Table className={cn('border-separate border-spacing-0', tableClassName)}>
      <TableHeader>
        <TableRow
          className={cn(
            'text-body-small-regular text-muted-foreground border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950',
            headerRowClassName,
          )}
        >
          {columns.map((column) => {
            const align = column.align ?? 'left';
            const sortable = column.sortable ?? true;
            const isActiveSortedColumn = sortState?.column === column.key;
            return (
              <TableHead
                key={column.key}
                className={cn(
                  column.widthClass,
                  'px-3 py-2 font-normal',
                  headerCellClassName,
                  align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {sortable ? (
                  <Button
                    type="button"
                    variant="white-contained"
                    className={cn(
                      'inline-flex h-auto w-full cursor-pointer items-center gap-1 rounded-none bg-transparent p-0 shadow-none',
                      isActiveSortedColumn
                        ? 'text-primary-500 hover:text-primary-500'
                        : 'text-muted-foreground hover:text-primary-500',
                      align === 'right' ? 'justify-end text-right' : 'justify-start text-left',
                    )}
                    onClick={() => handleSort(column.key)}
                  >
                    <span
                      className={cn(
                        'text-body-caption',
                        isActiveSortedColumn ? 'text-primary-500' : undefined,
                      )}
                    >
                      {column.label}
                    </span>
                    <SortIcon direction={isActiveSortedColumn ? sortState.direction : null} />
                  </Button>
                ) : (
                  <span className="text-body-caption">{column.label}</span>
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading ? (
          Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
            <TableRow
              key={`skeleton-${rowIndex}`}
              className="border-b border-neutral-200/90 dark:border-neutral-800/90"
            >
              {columns.map((column) => {
                const align = column.align ?? 'left';
                return (
                  <TableCell
                    key={`${String(column.key)}-skeleton-${rowIndex}`}
                    className={cn(
                      'px-3 py-2 align-middle',
                      column.widthClass,
                      align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    <div
                      className={cn(
                        'bg-muted inline-block h-4 animate-pulse rounded',
                        align === 'right' ? 'w-20' : 'w-24',
                      )}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="text-body-large-regular text-muted-foreground px-3 py-8 text-center"
            >
              {emptyContent ?? 'No data available'}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, index) => (
            <TableRow
              key={rowKey(row, index)}
              className={cn(
                'text-body-small-medium border-b border-neutral-200/90 last:border-b-0 hover:bg-neutral-50/60 dark:border-neutral-800/90 dark:hover:bg-neutral-900/40',
                onRowClick ? 'cursor-pointer' : '',
                rowClassName,
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => {
                const align = column.align ?? 'left';
                return (
                  <TableCell
                    key={column.key}
                    className={cn(
                      'text-foreground px-3 py-2 align-middle',
                      column.widthClass,
                      align === 'right' ? 'text-right' : 'text-left',
                      typeof column.cellClassName === 'function'
                        ? column.cellClassName(row)
                        : column.cellClassName,
                    )}
                  >
                    {column.renderCell(row)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
