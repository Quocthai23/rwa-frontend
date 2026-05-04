'use client';

import { Button } from '@/components/shared/atoms/button';
import { ChevronDown, DotsHorizontal, Star01 } from '@untitledui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/atoms/tooltip';
import { notFound, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { getCopyTraderById } from './data';
import { OverviewTab } from './tabs/OverviewTab';
import { PositionsTab } from './tabs/PositionsTab';
import { TradesTab } from './tabs/TradesTab';
import { CopierDataTab } from './tabs/CopierDataTab';
import { TransferRecordsTab } from './tabs/TransferRecordsTab';

type CopyTradingDetailProps = {
  id: string;
};

const PERFORMANCE_TABS = ['ROI', 'PnL'] as const;
const SECTION_TABS = ['Overview', 'Positions', 'Trades', 'Copier Data', 'Transfer Records'] as const;
const AXIS_LABELS = ['03-30', '04-04', '04-09', '04-14', '04-19', '04-24', '04-27'];
const ROI_LEVELS = ['60%', '40%', '20%', '0%', '-20%'];

function TraderAvatar({ alias, className }: { alias: string; className: string }) {
  return (
    <div
      className={`bg-linear-to-br flex size-20 shrink-0 items-center justify-center rounded-full ${className} text-xl font-semibold text-white`}
    >
      {alias}
    </div>
  );
}

function RoiChart() {
  return (
    <div className="relative h-55 w-full">
      <div className="absolute inset-0 flex flex-col justify-between">
        {ROI_LEVELS.map((level) => (
          <div key={level} className="flex items-center gap-4">
            <span className="text-muted-foreground w-8 text-xs">{level}</span>
            <div className="bg-border h-px flex-1" />
          </div>
        ))}
      </div>

      <svg
        viewBox="0 0 700 170"
        className="absolute right-0 bottom-6 left-12 h-42.5 w-[calc(100%-48px)]"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="copy-trading-roi-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12B76A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#12B76A" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path
          d="M0 146 H520 C538 146 542 138 546 122 C550 88 560 64 580 62 C600 60 620 102 640 116 C652 124 664 106 676 58 C684 24 692 8 700 8"
          fill="none"
          stroke="#12B76A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M0 146 H520 C538 146 542 138 546 122 C550 88 560 64 580 62 C600 60 620 102 640 116 C652 124 664 106 676 58 C684 24 692 8 700 8 V170 H0 Z"
          fill="url(#copy-trading-roi-fill)"
        />
      </svg>

      <div className="absolute right-0 bottom-0 left-12 flex items-center justify-between text-xs text-neutral-500">
        {AXIS_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function TopTradedDonut({
  primaryLabel,
  primaryRatio,
}: {
  primaryLabel: string;
  primaryRatio: number;
}) {
  const secondaryRatio = Math.max(0, 100 - primaryRatio);
  return (
    <div
      className="relative size-40 rounded-full"
      style={{
        background: `conic-gradient(#2B6FE8 0 ${primaryRatio}%, #FFD23F ${primaryRatio}% ${
          primaryRatio + secondaryRatio
        }%)`,
      }}
    >
      <div className="bg-background absolute inset-6 flex flex-col items-center justify-center rounded-full">
        <span className="text-muted-foreground text-sm">{primaryLabel}</span>
        <span className="text-body-large-semibold text-foreground">{primaryRatio}%</span>
      </div>
    </div>
  );
}

function MetricSection({
  accentClassName,
  title,
  rightLabel,
  rows,
  summary,
}: {
  accentClassName: string;
  title: string;
  rightLabel?: string;
  rows: Array<{ label: string; value: string; tooltip?: string }>;
  summary?: Array<{ label: string; value: string; tooltip?: string }>;
}) {
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
              key={`${item.label}-${index}`}
              className={index === 0 ? 'border-border border-r pr-4 text-center' : 'pl-4 text-center'}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-muted-foreground text-sm cursor-help">{item.label}</p>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="max-w-60">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-xs opacity-90">{item.tooltip ?? item.value}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <p className="text-body-large-semibold text-foreground mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help underline decoration-dotted underline-offset-3">
                  {row.label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                <div className="space-y-1">
                  <p className="text-xs font-semibold">{row.label}</p>
                  <p className="text-xs opacity-90">{row.tooltip ?? row.value}</p>
                </div>
              </TooltipContent>
            </Tooltip>
            <span className="text-foreground font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CopyTradingDetail({ id }: CopyTradingDetailProps) {
  const router = useRouter();
  const [performanceTab, setPerformanceTab] = useState<(typeof PERFORMANCE_TABS)[number]>('ROI');
  const [activeSectionTab, setActiveSectionTab] =
    useState<(typeof SECTION_TABS)[number]>('Overview');
  const trader = getCopyTraderById(id);

  const topTradedPrimary = useMemo(() => {
    if (!trader) return { label: 'ETH', ratio: 90 };
    const first = trader.topTraded[0];
    return {
      label: first?.pair || 'ETH',
      ratio: Number.parseFloat(first?.ratio || '90') || 90,
    };
  }, [trader]);

  if (!trader) {
    notFound();
  }

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex w-full flex-col gap-8 px-20 py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-6">
            <button
              type="button"
              className="focus-visible:ring-primary-500 rounded-full focus-visible:ring-2 focus-visible:outline-none"
              onClick={() => router.back()}
            >
              <TraderAvatar alias={trader.alias} className={trader.avatarClassName} />
            </button>
            <div className="pt-2">
              <div className="flex items-center gap-3">
                <h1 className="text-h2-semibold text-foreground">{trader.name}</h1>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <DotsHorizontal size={20} />
                </button>
              </div>
              <p className="text-muted-foreground mt-1 text-base">{trader.bio}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <Button variant="primary-ghost" className="text-button-large-medium h-10 rounded px-4">
              <Star01 size={18} />
              Follow
            </Button>
            <Button variant="primary-contained" className="text-button-large-medium h-10 rounded px-4">
              Copy
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.9fr_1fr]">
          <section className="border-border bg-background rounded border p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                {PERFORMANCE_TABS.map((tab) => {
                  const isActive = tab === performanceTab;
                  return (
                    <Button
                      key={tab}
                      type="button"
                      variant={isActive ? 'primary-ghost' : 'white-contained'}
                      className={isActive ? 'text-button-large-medium h-10 rounded px-4' : 'text-button-large-medium text-muted-foreground h-10 rounded px-0 shadow-none'}
                      onClick={() => setPerformanceTab(tab)}
                    >
                      {tab}
                    </Button>
                  );
                })}
              </div>

              <button type="button" className="text-body-large-semibold text-foreground inline-flex items-center gap-1">
                30 Days
                <ChevronDown size={16} />
              </button>
            </div>
            <RoiChart />
          </section>

          <section className="border-border bg-background rounded border p-4">
            <h2 className="text-body-large-semibold text-foreground mb-5">Top Traded</h2>
            <div className="flex flex-col items-center gap-6">
              <TopTradedDonut
                primaryLabel={topTradedPrimary.label}
                primaryRatio={topTradedPrimary.ratio}
              />

              <div className="w-full">
                <div className="text-muted-foreground mb-2 grid grid-cols-[1.2fr_0.8fr_0.8fr] text-xs">
                  <span>Trading Pair</span>
                  <span className="text-right">Ratio</span>
                  <span className="text-right">PnL</span>
                </div>

                <div className="space-y-1">
                  {trader.topTraded.map((item) => (
                    <div key={item.pair} className="grid grid-cols-[1.2fr_0.8fr_0.8fr] items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${item.colorClassName}`} />
                        <span className="text-muted-foreground">{item.pair}</span>
                      </div>
                      <span className="text-foreground text-right font-semibold">{item.ratio}</span>
                      <span className="text-right font-semibold text-green-500">{item.pnl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap gap-3">
          {SECTION_TABS.map((tab) => (
            <Button
              key={tab}
              type="button"
              variant={tab === activeSectionTab ? 'primary-ghost' : 'white-contained'}
              className={
                tab === activeSectionTab
                  ? 'text-button-large-medium h-10 rounded px-4'
                  : 'text-button-large-medium text-muted-foreground h-10 rounded px-1 shadow-none'
              }
              onClick={() => setActiveSectionTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>

        {activeSectionTab === 'Overview' ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <MetricSection
              accentClassName="bg-[#FBBF24]"
              title="Trader Profitability"
              rightLabel="30 Days"
              summary={[
                {
                  label: '30D ROI',
                  value: trader.roi,
                  tooltip: 'Total return over the last 30 days. Updated every 15 minutes.',
                },
                {
                  label: '30D ROI',
                  value: trader.roiUsdt,
                  tooltip: 'Estimated profit in USDT over the last 30 days. Updated every 15 minutes.',
                },
              ]}
              rows={[
                {
                  label: '30D Win Ratio',
                  tooltip: 'Percentage of winning trades out of total trades. Updated every 15 minutes.',
                  value: trader.winRatio,
                },
                {
                  label: 'Principal',
                  tooltip: 'Total assets in your copy trading account. Updated every 15 minutes.',
                  value: trader.principal,
                },
                {
                  label: 'Total Positions',
                  tooltip: 'Total number of historical positions. Updated every 15 minutes.',
                  value: trader.totalPositions,
                },
                {
                  label: 'Win Positions',
                  tooltip: 'Number of positions closed with a net profit. Updated every 15 minutes.',
                  value: trader.winPositions,
                },
                {
                  label: 'Loss Positions',
                  tooltip: 'Number of positions closed with a net loss. Updated every 15 minutes.',
                  value: trader.lossPositions,
                },
                {
                  label: 'Average Profit',
                  tooltip: 'Average profit for winning positions. Updated every 15 minutes.',
                  value: trader.averageProfit,
                },
                {
                  label: 'Average Loss',
                  tooltip: 'Average loss for losing positions. Updated every 15 minutes.',
                  value: trader.averageLoss,
                },
                {
                  label: 'PnL Ratio',
                  tooltip:
                    'Sum of profits from winning trades divided by sum of losses from losing trades. Updated every 15 minutes.',
                  value: trader.pnlRatio,
                },
              ]}
            />

            <MetricSection
              accentClassName="bg-[#12B76A]"
              title="Trader Activities"
              rows={[
                {
                  label: 'Copy Trading Days',
                  tooltip: 'Number of days since this trader opened their first copy trading order.',
                  value: trader.copyTradingDays,
                },
                {
                  label: 'Average Holding Time',
                  tooltip: 'Average duration a position is held open, from first trade on this account.',
                  value: trader.averageHoldingTime,
                },
                {
                  label: 'Trading Frequency (Weekly)',
                  tooltip: 'Average number of new positions opened per week.',
                  value: trader.tradingFrequency,
                },
                {
                  label: 'Last Trading Time',
                  tooltip: 'Time of the most recent order opened or closed.',
                  value: trader.lastTradingTime,
                },
              ]}
            />

            <MetricSection
              accentClassName="bg-[#12B76A]"
              title="Trader Risk"
              rightLabel="30 Days"
              rows={[
                {
                  label: '30D Max. Drawdown',
                  tooltip:
                    'The largest peak-to-trough decline in account value over 30 days. Lower is better. Updated every hour.',
                  value: trader.drawdown,
                },
                {
                  label: '30D Risk Rating',
                  tooltip:
                    'Risk score from 1 to 9 based on drawdown. Higher number means higher risk. Updated every 30 minutes.',
                  value: trader.riskRating,
                },
                {
                  label: '30D Sharpe Ratio',
                  tooltip: 'Return measured per unit of risk taken. Higher is better. Updated every 30 minutes.',
                  value: trader.sharpe,
                },
              ]}
            />

            <MetricSection
              accentClassName="bg-[#2B6FE8]"
              title="Copier Performance & Scale"
              rows={[
                {
                  label: "Copiers' Earnings",
                  tooltip:
                    'Total cumulative profit earned by all copiers of this trader. Updated every 15 minutes.',
                  value: trader.copiersEarnings,
                },
                {
                  label: 'Current Copiers',
                  tooltip: 'Number of people currently copying this trader. Updated every 15 minutes.',
                  value: trader.currentCopiers,
                },
                {
                  label: 'Cumulative Copiers',
                  tooltip: 'Total number of people who have ever copied this trader. Updated every 15 minutes.',
                  value: trader.cumulativeCopiers,
                },
                {
                  label: 'AUM',
                  tooltip: 'Total assets copied from this trader across all copiers. Applies to perpetual futures only.',
                  value: trader.aum,
                },
                {
                  label: 'Profit Share (%)',
                  tooltip: 'Percentage of your profit paid to the trader as a fee. Settled weekly.',
                  value: trader.profitShare,
                },
              ]}
            />
          </div>
        ) : null}

        {activeSectionTab === 'Positions' ? <PositionsTab /> : null}
        {activeSectionTab === 'Trades' ? <TradesTab /> : null}
        {activeSectionTab === 'Copier Data' ? <CopierDataTab /> : null}
        {activeSectionTab === 'Transfer Records' ? <TransferRecordsTab /> : null}
      </div>
    </div>
  );
}
