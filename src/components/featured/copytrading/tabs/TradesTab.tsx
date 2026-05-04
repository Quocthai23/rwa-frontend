'use client';

import { ChevronRight } from '@untitledui/icons';
import { useState } from 'react';
import { Pagination } from './Pagination';

interface Trade {
  id: string;
  pair: string;
  side: 'Long' | 'Short';
  entryPrice: string;
  exitPrice: string;
  size: string;
  pnl: string;
  pnlPercent: string;
  entryTime: string;
  exitTime: string;
  duration: string;
}

export function TradesTab() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const mockTrades: Trade[] = [
    {
      id: '1',
      pair: 'BTC/USDT',
      side: 'Long',
      entryPrice: '41,500.00',
      exitPrice: '42,800.00',
      size: '0.8',
      pnl: '+1,040.00',
      pnlPercent: '+3.13%',
      entryTime: '2026-04-26 15:20:00',
      exitTime: '2026-04-27 09:15:00',
      duration: '17h 55m',
    },
    {
      id: '2',
      pair: 'ETH/USDT',
      side: 'Long',
      entryPrice: '2,750.00',
      exitPrice: '2,920.00',
      size: '2.0',
      pnl: '+340.00',
      pnlPercent: '+6.18%',
      entryTime: '2026-04-25 08:30:00',
      exitTime: '2026-04-26 14:45:00',
      duration: '30h 15m',
    },
    {
      id: '3',
      pair: 'SOL/USDT',
      side: 'Short',
      entryPrice: '145.00',
      exitPrice: '140.50',
      size: '5.0',
      pnl: '+225.00',
      pnlPercent: '+3.10%',
      entryTime: '2026-04-24 12:10:00',
      exitTime: '2026-04-25 03:30:00',
      duration: '15h 20m',
    },
    {
      id: '4',
      pair: 'BTC/USDT',
      side: 'Short',
      entryPrice: '43,200.00',
      exitPrice: '42,500.00',
      size: '0.5',
      pnl: '+350.00',
      pnlPercent: '+1.62%',
      entryTime: '2026-04-23 16:45:00',
      exitTime: '2026-04-24 11:20:00',
      duration: '18h 35m',
    },
    {
      id: '5',
      pair: 'ETH/USDT',
      side: 'Short',
      entryPrice: '2,900.00',
      exitPrice: '2,750.00',
      size: '1.5',
      pnl: '+225.00',
      pnlPercent: '+5.17%',
      entryTime: '2026-04-22 10:00:00',
      exitTime: '2026-04-23 14:30:00',
      duration: '28h 30m',
    },
  ];

  const totalPages = Math.ceil(mockTrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = mockTrades.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="border-border bg-background rounded border overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_1.2fr_0.5fr] gap-4 border-border border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
          <span>Trading Pair</span>
          <span>Entry Price</span>
          <span>Exit Price</span>
          <span>Size</span>
          <span>PnL</span>
          <span>Duration</span>
          <span></span>
        </div>

        <div className="divide-y divide-border">
          {paginatedData.map((trade) => (
            <div
              key={trade.id}
              className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_1.2fr_0.5fr] gap-4 items-center px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${trade.side === 'Long' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="text-foreground font-semibold text-sm">{trade.pair}</p>
                  <p className="text-muted-foreground text-xs">{trade.side}</p>
                </div>
              </div>

              <span className="text-foreground text-sm">${trade.entryPrice}</span>
              <span className="text-foreground text-sm">${trade.exitPrice}</span>
              <span className="text-foreground text-sm">{trade.size}</span>

              <div>
                <p className={`text-sm font-semibold ${trade.pnl.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.pnl}
                </p>
                <p className={`text-xs ${trade.pnl.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.pnlPercent}
                </p>
              </div>

              <span className="text-muted-foreground text-sm">{trade.duration}</span>

              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={mockTrades.length}
      />
    </div>
  );
}
