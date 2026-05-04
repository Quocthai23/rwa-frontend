'use client';

import { ChevronRight } from '@untitledui/icons';
import { useState } from 'react';
import { Pagination } from './Pagination';

type HistoryTab = 'Open History' | 'Positions History';

interface OpenHistoryPosition {
  id: string;
  positionLabel: string; // e.g. ETHUSDT Long Cross 15X
  openTime: string;
  entryPrice: string;
  currentPrice: string;
  totalOpened: string;
  positionPnl: string;
}

interface PositionsHistoryPosition {
  id: string;
  positionLabel: string; // e.g. ETHUSDT Short Cross 15X
  openTime: string;
  closeTime: string;
  entryPrice: string;
  avgClosePrice: string;
  totalOpened: string;
  totalClosed: string;
  positionPnl: string;
  realizedPnl: string;
  fundingFee: string;
  fee: string;
}

export function PositionsTab() {
  const [historyTab, setHistoryTab] = useState<HistoryTab>('Positions History');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const mockOpenHistory: OpenHistoryPosition[] = [
    {
      id: '1',
      positionLabel: 'ETHUSDT Long Cross 15X',
      openTime: 'Open Time 2026-04-27 12:48:08',
      entryPrice: '2,318.78 USDT',
      currentPrice: '2,324.00 USDT',
      totalOpened: 'Total Opened 0.39 ETH',
      positionPnl: 'Position PnL +0.9413 USDT',
    },
    {
      id: '2',
      positionLabel: 'ETHUSDT Short Cross 15X',
      openTime: 'Open Time 2026-04-27 09:49:57',
      entryPrice: '2,392.74 USDT',
      currentPrice: '2,390.00 USDT',
      totalOpened: 'Total Opened 0.70 ETH',
      positionPnl: 'Position PnL +8.6544 USDT',
    },
    {
      id: '3',
      positionLabel: 'ETHUSDT Short Cross 15X',
      openTime: 'Open Time 2026-04-27 12:02:32',
      entryPrice: '2,392.74 USDT',
      currentPrice: '2,378.00 USDT',
      totalOpened: 'Total Opened 0.70 ETH',
      positionPnl: 'Position PnL +8.6544 USDT',
    },
  ];

  const mockPositionsHistory: PositionsHistoryPosition[] = [
    {
      id: '1',
      positionLabel: 'ETHUSDT Long Cross 15X',
      openTime: 'Open Time 2026-04-27 12:48:08',
      closeTime: 'Close Time 2026-04-27 12:58:42',
      entryPrice: '2,318.78 USDT',
      avgClosePrice: '2,323.51 USDT',
      totalOpened: 'Total Opened 0.39 ETH',
      totalClosed: 'Total Closed 0.39 ETH',
      positionPnl: 'Position PnL +0.9413 USDT',
      realizedPnl: 'Realized PnL +1.8465 USDT',
      fundingFee: 'Funding Fee +0.00 USDT',
      fee: 'Fee -0.902 USDT',
    },
    {
      id: '2',
      positionLabel: 'ETHUSDT Short Cross 15X',
      openTime: 'Open Time 2026-04-27 09:49:57',
      closeTime: 'Close Time 2026-04-27 12:02:32',
      entryPrice: '2,392.74 USDT',
      avgClosePrice: '2,378.00 USDT',
      totalOpened: 'Total Opened 0.70 ETH',
      totalClosed: 'Total Closed 0.70 ETH',
      positionPnl: 'Position PnL +8.6544 USDT',
      realizedPnl: 'Realized PnL +10.3151 USDT',
      fundingFee: 'Funding Fee +0.00 USDT',
      fee: 'Fee -1.661 USDT',
    },
  ];

  const activeMockData = historyTab === 'Open History' ? mockOpenHistory : mockPositionsHistory;
  const totalPages = Math.ceil(activeMockData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOpen = mockOpenHistory.slice(startIndex, startIndex + itemsPerPage);
  const paginatedClosed = mockPositionsHistory.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 border-border border-b pb-2">
        <button
          type="button"
          className={`text-sm font-medium transition-colors ${
            historyTab === 'Open History' ? 'text-primary-500' : 'text-muted-foreground hover:text-foreground'
          } ${historyTab === 'Open History' ? 'border-b-2 border-primary-500 pb-2 -mb-px' : 'pb-2'}`}
          onClick={() => {
            setHistoryTab('Open History');
            setCurrentPage(1);
          }}
        >
          Open History
        </button>
        <button
          type="button"
          className={`text-sm font-medium transition-colors ${
            historyTab === 'Positions History' ? 'text-primary-500' : 'text-muted-foreground hover:text-foreground'
          } ${historyTab === 'Positions History' ? 'border-b-2 border-primary-500 pb-2 -mb-px' : 'pb-2'}`}
          onClick={() => {
            setHistoryTab('Positions History');
            setCurrentPage(1);
          }}
        >
          Positions History
        </button>
      </div>

      <div className="border-border bg-background rounded border overflow-hidden">
        <div className="overflow-x-auto">
          {historyTab === 'Open History' ? (
            <div>
              <div className="grid min-w-[900px] grid-cols-[2fr_1.5fr_1.2fr_1.2fr_1.2fr_1.2fr_0.6fr] gap-4 border-border border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
                <span>Trading Pair</span>
                <span>Open Time</span>
                <span>Entry Price</span>
                <span>Current Price</span>
                <span>Total Opened</span>
                <span>Position PnL</span>
                <span />
              </div>

              <div className="divide-y divide-border">
                {paginatedOpen.map((position) => (
                  <div
                    key={position.id}
                    className="grid min-w-[900px] grid-cols-[2fr_1.5fr_1.2fr_1.2fr_1.2fr_1.2fr_0.6fr] gap-4 items-center px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-foreground font-semibold text-sm">{position.positionLabel}</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-sm">{position.openTime}</span>
                    <span className="text-foreground text-sm">{position.entryPrice}</span>
                    <span className="text-foreground text-sm">{position.currentPrice}</span>
                    <span className="text-foreground text-sm">{position.totalOpened}</span>
                    <span className="text-foreground text-sm font-semibold">{position.positionPnl}</span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="grid min-w-[1150px] grid-cols-[2fr_1.3fr_1.3fr_1.1fr_1.2fr_1.1fr_1.1fr_1.2fr_1.2fr_1.1fr_0.9fr] gap-4 border-border border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
                <span>Trading Pair</span>
                <span>Open Time</span>
                <span>Close Time</span>
                <span>Entry Price</span>
                <span>Avg. Close Price</span>
                <span>Total Opened</span>
                <span>Total Closed</span>
                <span>Position PnL</span>
                <span>Realized PnL</span>
                <span>Funding Fee</span>
                <span>Fee</span>
              </div>

              <div className="divide-y divide-border">
                {paginatedClosed.map((position) => (
                  <div
                    key={position.id}
                    className="grid min-w-[1150px] grid-cols-[2fr_1.3fr_1.3fr_1.1fr_1.2fr_1.1fr_1.1fr_1.2fr_1.2fr_1.1fr_0.9fr] gap-4 items-center px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-foreground font-semibold text-sm">{position.positionLabel}</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-sm">{position.openTime}</span>
                    <span className="text-muted-foreground text-sm">{position.closeTime}</span>
                    <span className="text-foreground text-sm">{position.entryPrice}</span>
                    <span className="text-foreground text-sm">{position.avgClosePrice}</span>
                    <span className="text-foreground text-sm">{position.totalOpened}</span>
                    <span className="text-foreground text-sm">{position.totalClosed}</span>
                    <span className="text-foreground text-sm font-semibold">{position.positionPnl}</span>
                    <span className="text-green-500 text-sm font-semibold">{position.realizedPnl}</span>
                    <span className="text-muted-foreground text-sm">{position.fundingFee}</span>
                    <span className="text-muted-foreground text-sm">{position.fee}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={activeMockData.length}
      />
    </div>
  );
}
