'use client';

import { useState } from 'react';
import { Pagination } from './Pagination';

interface TransferRecord {
  id: string;
  time: string;
  type: 'Deposit' | 'Withdrawal' | 'Profit Transfer';
  total: string;
  assets: string;
}

export function TransferRecordsTab() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const mockTransfers: TransferRecord[] = [
    {
      id: '1',
      time: '2026-04-28 14:30:00',
      type: 'Profit Transfer',
      total: '+2,150.50',
      assets: '2150.50',
    },
    {
      id: '2',
      time: '2026-04-27 09:15:00',
      type: 'Profit Transfer',
      total: '+892.75',
      assets: '892.75',
    },
    {
      id: '3',
      time: '2026-04-26 16:45:00',
      type: 'Deposit',
      total: '+5,000.00',
      assets: '5000.00',
    },
    {
      id: '4',
      time: '2026-04-25 11:20:00',
      type: 'Profit Transfer',
      total: '+1,456.20',
      assets: '1456.20',
    },
    {
      id: '5',
      time: '2026-04-28 13:00:00',
      type: 'Withdrawal',
      total: '-2,000.00',
      assets: '2000.00',
    },
    {
      id: '6',
      time: '2026-04-24 08:30:00',
      type: 'Withdrawal',
      total: '-500.00',
      assets: '500.00',
    },
  ];

  const totalPages = Math.ceil(mockTransfers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = mockTransfers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="border-border bg-background rounded border overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-border border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
          <span>Time</span>
          <span>Type</span>
          <span>Total</span>
          <span>Assets</span>
        </div>

        <div className="divide-y divide-border">
          {paginatedData.map((transfer) => (
            <div
              key={transfer.id}
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 items-center px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <span className="text-muted-foreground text-sm">{transfer.time}</span>

              <span className="text-foreground text-sm">{transfer.type}</span>

              <span className={`text-sm font-semibold ${transfer.total.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {transfer.total}
              </span>

              <span className="text-foreground text-sm">{transfer.assets}</span>
            </div>
          ))}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={mockTransfers.length}
      />
    </div>
  );
}
