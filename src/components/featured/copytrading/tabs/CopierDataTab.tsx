'use client';

import { useState } from 'react';
import { Pagination } from './Pagination';

interface Copier {
  id: string;
  copierName: string;
  copyDays: number;
  copyAssets: string;
  pnl: string;
}

export function CopierDataTab() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const mockCopiers: Copier[] = [
    {
      id: '1',
      copierName: 'au***1@mail.ru',
      copyDays: 1,
      copyAssets: '20',
      pnl: '+0.04',
    },
    {
      id: '2',
      copierName: 'be***2@example.com',
      copyDays: 2,
      copyAssets: '35',
      pnl: '+0.10',
    },
    {
      id: '3',
      copierName: 'ci***3@yahoo.com',
      copyDays: 3,
      copyAssets: '50',
      pnl: '+0.15',
    },
    {
      id: '4',
      copierName: 'do***4@outlook.com',
      copyDays: 4,
      copyAssets: '25',
      pnl: '+0.05',
    },
    {
      id: '5',
      copierName: 'ef***5@gmail.com',
      copyDays: 5,
      copyAssets: '40',
      pnl: '+0.20',
    },
    {
      id: '6',
      copierName: 'fg***6@mail.com',
      copyDays: 6,
      copyAssets: '30',
      pnl: '+0.08',
    },
    {
      id: '7',
      copierName: 'gh***7@live.com',
      copyDays: 7,
      copyAssets: '55',
      pnl: '+0.12',
    },
    {
      id: '8',
      copierName: 'hi***8@icloud.com',
      copyDays: 8,
      copyAssets: '28',
      pnl: '+0.18',
    },
    {
      id: '9',
      copierName: 'ij***9@protonmail.com',
      copyDays: 9,
      copyAssets: '45',
      pnl: '+0.14',
    },
  ];

  const totalPages = Math.ceil(mockCopiers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = mockCopiers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="border-border bg-background rounded border overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-border border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
          <span>Copiers</span>
          <span>Copy Days</span>
          <span>Copy Assets (USDT)</span>
          <span>PnL (USDT)</span>
        </div>

        <div className="divide-y divide-border">
          {paginatedData.map((copier) => (
            <div
              key={copier.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 items-center px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div>
                <p className="text-foreground font-semibold text-sm">{copier.copierName}</p>
              </div>

              <span className="text-foreground text-sm">{copier.copyDays}</span>

              <span className="text-foreground text-sm">{copier.copyAssets}</span>

              <span className={`text-sm font-semibold ${copier.pnl.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {copier.pnl}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={mockCopiers.length}
      />
    </div>
  );
}
