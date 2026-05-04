'use client';

import { ChevronDown } from '@untitledui/icons';
import { Button } from '@/components/shared/atoms/button';
import type { TraderProfile } from '../data';

interface MetricRowProps {
  label: string;
  value: string;
}

interface MetricSectionProps {
  accentClassName: string;
  title: string;
  rightLabel?: string;
  rows: MetricRowProps[];
  summary?: MetricRowProps[];
}

function MetricSection({
  accentClassName,
  title,
  rightLabel,
  rows,
  summary,
}: MetricSectionProps) {
  return (
    <section className="border-border bg-background rounded border p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-5 w-0.5 rounded-full ${accentClassName}`} />
          <h3 className="text-body-large-semibold text-foreground">{title}</h3>
        </div>
        {rightLabel ? (
          <button type="button" className="text-body-large-semibold text-foreground inline-flex items-center gap-1">
            {rightLabel}
            <ChevronDown size={16} />
          </button>
        ) : null}
      </div>

      {summary ? (
        <div className="bg-muted/40 mb-4 grid grid-cols-2 rounded px-4 py-3">
          {summary.map((item, index) => (
            <div
              key={item.label}
              className={index === 0 ? 'border-border border-r pr-4 text-center' : 'pl-4 text-center'}
            >
              <p className="text-muted-foreground text-sm">{item.label}</p>
              <p className="text-body-large-semibold text-foreground mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground underline decoration-dotted underline-offset-3">
              {row.label}
            </span>
            <span className="text-foreground font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OverviewTab({ trader }: { trader: TraderProfile }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MetricSection
        accentClassName="bg-[#FBBF24]"
        title="Trader Profitability"
        rightLabel="30 Days"
        summary={[
          { label: '30D ROI', value: trader.roi },
          { label: '30D ROI', value: trader.roiUsdt },
        ]}
        rows={[
          { label: '30D win ratio', value: trader.winRatio },
          { label: 'Principal', value: trader.principal },
          { label: 'Total positions', value: trader.totalPositions },
          { label: 'Win positions', value: trader.winPositions },
          { label: 'Loss positions', value: trader.lossPositions },
          { label: 'Average profit', value: trader.averageProfit },
          { label: 'Average loss', value: trader.averageLoss },
          { label: 'PnL ratio', value: trader.pnlRatio },
        ]}
      />

      <MetricSection
        accentClassName="bg-[#12B76A]"
        title="Trader Activities"
        rows={[
          { label: 'Copy Trading days', value: trader.copyTradingDays },
          { label: 'Average Holding Time', value: trader.averageHoldingTime },
          { label: 'Trading Frequency (Weekly)', value: trader.tradingFrequency },
          { label: 'Last Trading Time', value: trader.lastTradingTime },
        ]}
      />

      <MetricSection
        accentClassName="bg-[#12B76A]"
        title="Trader Risk"
        rightLabel="30 Days"
        rows={[
          { label: '30D max. drawdown', value: trader.drawdown },
          { label: '30D risk rating', value: trader.riskRating },
          { label: '30D Sharpe ratio', value: trader.sharpe },
        ]}
      />

      <MetricSection
        accentClassName="bg-[#2B6FE8]"
        title="Copier Performance & Scale"
        rows={[
          { label: "Copiers' Earnings", value: trader.copiersEarnings },
          { label: 'Current copiers', value: trader.currentCopiers },
          { label: 'Cumulative Copiers', value: trader.cumulativeCopiers },
          { label: 'AUM', value: trader.aum },
          { label: 'Profit Share (%)', value: trader.profitShare },
        ]}
      />
    </div>
  );
}
