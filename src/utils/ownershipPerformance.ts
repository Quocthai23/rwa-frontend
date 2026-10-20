import type { PortfolioItem } from '@/types/portfolio';
// Never present a return for transferred/seeded holdings without a known cost basis.
export function getOwnershipPerformance(
  item: Pick<PortfolioItem, 'averageBuyPrice' | 'currentPrice'>,
) {
  const cost = Number(item.averageBuyPrice);
  const price = Number(item.currentPrice);
  return {
    percent:
      item.averageBuyPrice.trim() !== '' &&
      item.currentPrice.trim() !== '' &&
      Number.isFinite(cost) &&
      cost > 0 &&
      Number.isFinite(price) &&
      price >= 0
        ? ((price - cost) / cost) * 100
        : null,
  };
}
