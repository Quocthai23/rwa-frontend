'use client';

import { useMemo, useState } from 'react';
import {
  ArrowNarrowRight,
  BarChart12,
  ChevronDown,
  FilterLines,
  SearchLg,
  Star01,
  Users01,
} from '@untitledui/icons';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import {
  COPY_TRADING_FILTERS,
  COPY_TRADING_TABS,
  COPY_TRADING_TRADERS,
  type TraderCard,
} from '@/components/featured/copytrading/data';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

function TraderSparkline() {
  return (
    <svg viewBox="0 0 126 40" className="h-10 w-32" fill="none" aria-hidden="true">
      <path
        d="M2 31H28L33 29L39 20L45 22L50 18L56 19L61 13L68 15L74 9L80 12L87 7L93 10L99 5L105 7L112 3L124 3"
        stroke="#12B76A"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TraderAvatar({ alias, className }: { alias: string; className: string }) {
  return (
    <div
      className={`bg-linear-to-br flex size-12 shrink-0 items-center justify-center rounded-full ${className} text-sm font-semibold text-white`}
    >
      {alias}
    </div>
  );
}

function TraderCardItem({ trader, onOpen }: { trader: TraderCard; onOpen: (id: string) => void }) {
  return (
    <div className="border-border bg-background flex flex-col gap-4 rounded border p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => onOpen(trader.id)}
        >
          <TraderAvatar alias={trader.alias} className={trader.avatarClassName} />
          <div className="min-w-0">
            <p className="text-body-large-semibold text-foreground truncate">{trader.name}</p>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-4 text-sm">
              <span>{trader.market}</span>
              <span className="text-foreground inline-flex items-center gap-1 font-semibold">
                <Users01 size={14} className="text-muted-foreground" />
                {trader.followers}
              </span>
            </div>
          </div>
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Save ${trader.name}`}
        >
          <Star01 size={24} />
        </button>
      </div>

      <button type="button" className="flex items-end justify-between gap-3 text-left" onClick={() => onOpen(trader.id)}>
        <div>
          <p className="text-neutral-500 text-body-small-regular">30D PnL</p>
          <p className="text-h2-semibold text-green-500">{trader.pnl}</p>
        </div>
        <TraderSparkline />
      </button>

      <button type="button" className="space-y-1 text-left text-sm" onClick={() => onOpen(trader.id)}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-neutral-500">30D Max. Drawdown</span>
          <span className="text-foreground font-semibold">{trader.drawdown}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-neutral-500">30D Sharpe Ratio</span>
          <span className="text-foreground font-semibold">{trader.sharpe}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-neutral-500">AUM</span>
          <span className="text-foreground font-semibold">{trader.aum}</span>
        </div>
      </button>

      <Button
        variant="primary-ghost"
        className="text-button-small-medium text-primary-500 h-10 w-full rounded"
        onClick={() => onOpen(trader.id)}
      >
        Copy
      </Button>
    </div>
  );
}

export default function CopyTrading() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof COPY_TRADING_TABS)[number]>('Leaderboard');
  const [selectedRange] = useState<(typeof COPY_TRADING_FILTERS.range)[number]>('30 Days');
  const [selectedMetric] = useState<(typeof COPY_TRADING_FILTERS.metric)[number]>('PnL');
  const [search, setSearch] = useState('');

  const filteredTraders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return COPY_TRADING_TRADERS;
    }

    return COPY_TRADING_TRADERS.filter((trader) => trader.name.toLowerCase().includes(keyword));
  }, [search]);

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex w-full flex-col gap-8 px-20 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-h2-semibold text-foreground">
            {t('copyTrading.title', 'Copy Trading Plaza')}
          </h1>

          <button
            type="button"
            className="text-primary-500 hover:text-primary-600 inline-flex items-center gap-2 self-start text-sm font-semibold transition-colors"
          >
            {t('copyTrading.becomeLeadTrader', 'Be a Lead Trader')}
            <ArrowNarrowRight size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {COPY_TRADING_TABS.map((tab) => {
            const isActive = tab === activeTab;

            return (
              <Button
                key={tab}
                type="button"
                variant={isActive ? 'primary-contained' : 'white-outline'}
                className="text-button-large-medium h-10 rounded px-4"
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'Leaderboard' ? <BarChart12 size={18} /> : null}
                {tab}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <Button variant="white-outline" className="text-button-large-medium h-10 rounded px-4">
                {selectedRange}
                <ChevronDown size={18} />
              </Button>
              <Button variant="white-outline" className="text-button-large-medium h-10 rounded px-4">
                {selectedMetric}
                <ChevronDown size={18} />
              </Button>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <div className="relative w-full xl:w-62.5">
                <SearchLg
                  size={18}
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('copyTrading.searchPlaceholder', "Trader's Name")}
                  className="h-10 pl-10 text-sm"
                />
              </div>

              <button
                type="button"
                className="border-border text-foreground hover:bg-muted inline-flex size-10 shrink-0 items-center justify-center rounded border transition-colors"
                aria-label={t('copyTrading.filter', 'Filter')}
              >
                <FilterLines size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {filteredTraders.map((trader) => (
              <TraderCardItem
                key={trader.id}
                trader={trader}
                onOpen={(id) => router.push(`/copytrading/${id}`)}
              />
            ))}
          </div>

          {filteredTraders.length === 0 ? (
            <div className="border-border text-muted-foreground rounded border border-dashed py-12 text-center text-sm">
              {t('copyTrading.noResults', 'No traders found.')}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
