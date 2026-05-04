'use client';

export type TraderCard = {
  id: string;
  name: string;
  alias: string;
  market: string;
  followers: string;
  pnl: string;
  drawdown: string;
  sharpe: string;
  aum: string;
  avatarClassName: string;
};

export type TraderProfile = TraderCard & {
  bio: string;
  roi: string;
  roiUsdt: string;
  winRatio: string;
  principal: string;
  totalPositions: string;
  winPositions: string;
  lossPositions: string;
  averageProfit: string;
  averageLoss: string;
  pnlRatio: string;
  copyTradingDays: string;
  averageHoldingTime: string;
  tradingFrequency: string;
  lastTradingTime: string;
  copiersEarnings: string;
  currentCopiers: string;
  cumulativeCopiers: string;
  profitShare: string;
  riskRating: string;
  topTraded: Array<{
    pair: string;
    ratio: string;
    pnl: string;
    colorClassName: string;
  }>;
};

export const COPY_TRADING_TABS = ['Leaderboard', 'Smart Ranking', 'Following'] as const;

export const COPY_TRADING_FILTERS = {
  range: ['30 Days', '7 Days', '90 Days'],
  metric: ['PnL', 'AUM', 'Sharpe'],
} as const;

export const COPY_TRADING_TRADERS: TraderProfile[] = [
  {
    id: '1',
    name: '$$$Paul.Tudor.J...',
    alias: 'PT',
    market: 'Perp',
    followers: '895 / 2000',
    pnl: '+4,972.61%',
    drawdown: '30.30%',
    sharpe: '6.63',
    aum: '149,207.15',
    avatarClassName: 'from-sky-500 to-indigo-600',
    bio: 'There’s nothing here yet.',
    roi: '+1,636.40%',
    roiUsdt: '+196.36 USDT',
    winRatio: '100%',
    principal: '208.36',
    totalPositions: '10',
    winPositions: '10',
    lossPositions: '0',
    averageProfit: '24.67',
    averageLoss: '0',
    pnlRatio: '--',
    copyTradingDays: '6D',
    averageHoldingTime: '13.03H',
    tradingFrequency: '10',
    lastTradingTime: '2026-04-27 12:58:42',
    copiersEarnings: '+728.66',
    currentCopiers: '19',
    cumulativeCopiers: '28',
    profitShare: '10%',
    riskRating: '7',
    topTraded: [
      { pair: 'ETH', ratio: '90.00%', pnl: '+246.82', colorClassName: 'bg-[#2B6FE8]' },
      { pair: 'BTC', ratio: '10.00%', pnl: '+4.50', colorClassName: 'bg-[#FFD23F]' },
    ],
  },
  {
    id: '2',
    name: 'JEROME POWELL',
    alias: 'JP',
    market: 'Perp',
    followers: '23 / 2000',
    pnl: '+4,069.40%',
    drawdown: '43.96%',
    sharpe: '5.09',
    aum: '2,002.50',
    avatarClassName: 'from-orange-400 to-rose-500',
    bio: 'Macro trend follower with strict risk limits.',
    roi: '+1,420.10%',
    roiUsdt: '+154.22 USDT',
    winRatio: '82%',
    principal: '300.00',
    totalPositions: '17',
    winPositions: '14',
    lossPositions: '3',
    averageProfit: '18.10',
    averageLoss: '4.80',
    pnlRatio: '3.77',
    copyTradingDays: '12D',
    averageHoldingTime: '8.12H',
    tradingFrequency: '17',
    lastTradingTime: '2026-04-28 08:20:31',
    copiersEarnings: '+318.42',
    currentCopiers: '12',
    cumulativeCopiers: '21',
    profitShare: '12%',
    riskRating: '6',
    topTraded: [
      { pair: 'BTC', ratio: '65.00%', pnl: '+124.18', colorClassName: 'bg-[#F59E0B]' },
      { pair: 'ETH', ratio: '35.00%', pnl: '+30.04', colorClassName: 'bg-[#2B6FE8]' },
    ],
  },
  {
    id: '3',
    name: 'Thomas Shelby Cr...',
    alias: 'TS',
    market: 'Perp',
    followers: '778 / 2000',
    pnl: '+3,840.91%',
    drawdown: '30.18%',
    sharpe: '6.52',
    aum: '60,981.78',
    avatarClassName: 'from-cyan-500 to-emerald-500',
    bio: 'Scalping volatile majors with disciplined exits.',
    roi: '+1,215.80%',
    roiUsdt: '+132.75 USDT',
    winRatio: '86%',
    principal: '420.00',
    totalPositions: '21',
    winPositions: '18',
    lossPositions: '3',
    averageProfit: '12.90',
    averageLoss: '3.10',
    pnlRatio: '4.16',
    copyTradingDays: '18D',
    averageHoldingTime: '4.25H',
    tradingFrequency: '21',
    lastTradingTime: '2026-04-28 13:06:54',
    copiersEarnings: '+504.30',
    currentCopiers: '36',
    cumulativeCopiers: '55',
    profitShare: '8%',
    riskRating: '5',
    topTraded: [
      { pair: 'ETH', ratio: '52.00%', pnl: '+80.11', colorClassName: 'bg-[#2B6FE8]' },
      { pair: 'SOL', ratio: '48.00%', pnl: '+52.64', colorClassName: 'bg-[#8B5CF6]' },
    ],
  },
  {
    id: '4',
    name: 'CashFlow King...',
    alias: 'CK',
    market: 'Perp',
    followers: '47 / 2000',
    pnl: '+3,840.91%',
    drawdown: '30.18%',
    sharpe: '6.52',
    aum: '60,981.78',
    avatarClassName: 'from-lime-500 to-green-600',
    bio: 'Momentum setups only. No overnight exposure.',
    roi: '+1,048.55%',
    roiUsdt: '+110.80 USDT',
    winRatio: '79%',
    principal: '512.00',
    totalPositions: '26',
    winPositions: '20',
    lossPositions: '6',
    averageProfit: '10.52',
    averageLoss: '2.73',
    pnlRatio: '3.85',
    copyTradingDays: '9D',
    averageHoldingTime: '2.80H',
    tradingFrequency: '26',
    lastTradingTime: '2026-04-28 15:10:09',
    copiersEarnings: '+266.12',
    currentCopiers: '9',
    cumulativeCopiers: '14',
    profitShare: '10%',
    riskRating: '6',
    topTraded: [
      { pair: 'BTC', ratio: '70.00%', pnl: '+92.40', colorClassName: 'bg-[#F59E0B]' },
      { pair: 'ETH', ratio: '30.00%', pnl: '+18.40', colorClassName: 'bg-[#2B6FE8]' },
    ],
  },
  {
    id: '5',
    name: 'President Power',
    alias: 'PP',
    market: 'Perp',
    followers: '895 / 2000',
    pnl: '+4,972.61%',
    drawdown: '30.30%',
    sharpe: '6.63',
    aum: '149,207.15',
    avatarClassName: 'from-fuchsia-500 to-violet-600',
    bio: 'Systematic trading with a bias toward high-liquidity pairs.',
    roi: '+1,702.30%',
    roiUsdt: '+244.10 USDT',
    winRatio: '93%',
    principal: '600.00',
    totalPositions: '29',
    winPositions: '27',
    lossPositions: '2',
    averageProfit: '20.48',
    averageLoss: '3.25',
    pnlRatio: '6.30',
    copyTradingDays: '20D',
    averageHoldingTime: '5.62H',
    tradingFrequency: '29',
    lastTradingTime: '2026-04-28 14:35:17',
    copiersEarnings: '+812.40',
    currentCopiers: '44',
    cumulativeCopiers: '67',
    profitShare: '9%',
    riskRating: '5',
    topTraded: [
      { pair: 'ETH', ratio: '58.00%', pnl: '+132.60', colorClassName: 'bg-[#2B6FE8]' },
      { pair: 'BTC', ratio: '42.00%', pnl: '+111.50', colorClassName: 'bg-[#F59E0B]' },
    ],
  },
  {
    id: '6',
    name: 'AURUM FLOW',
    alias: 'AF',
    market: 'Perp',
    followers: '23 / 2000',
    pnl: '+4,069.40%',
    drawdown: '43.96%',
    sharpe: '5.09',
    aum: '2,002.50',
    avatarClassName: 'from-amber-500 to-orange-600',
    bio: 'Focuses on precious metals and macro correlations.',
    roi: '+1,118.14%',
    roiUsdt: '+98.45 USDT',
    winRatio: '74%',
    principal: '190.50',
    totalPositions: '13',
    winPositions: '10',
    lossPositions: '3',
    averageProfit: '9.16',
    averageLoss: '2.85',
    pnlRatio: '3.21',
    copyTradingDays: '11D',
    averageHoldingTime: '9.25H',
    tradingFrequency: '13',
    lastTradingTime: '2026-04-28 06:18:40',
    copiersEarnings: '+201.34',
    currentCopiers: '7',
    cumulativeCopiers: '11',
    profitShare: '10%',
    riskRating: '7',
    topTraded: [
      { pair: 'XAU', ratio: '76.00%', pnl: '+81.22', colorClassName: 'bg-[#FBBF24]' },
      { pair: 'ETH', ratio: '24.00%', pnl: '+17.23', colorClassName: 'bg-[#2B6FE8]' },
    ],
  },
  {
    id: '7',
    name: 'ICY CRYPTO...',
    alias: 'IC',
    market: 'Perp',
    followers: '778 / 2000',
    pnl: '+3,840.91%',
    drawdown: '30.18%',
    sharpe: '6.52',
    aum: '60,981.78',
    avatarClassName: 'from-pink-500 to-rose-600',
    bio: 'High-frequency crypto execution across majors.',
    roi: '+1,280.91%',
    roiUsdt: '+186.12 USDT',
    winRatio: '88%',
    principal: '356.20',
    totalPositions: '24',
    winPositions: '21',
    lossPositions: '3',
    averageProfit: '15.64',
    averageLoss: '2.44',
    pnlRatio: '6.41',
    copyTradingDays: '15D',
    averageHoldingTime: '3.60H',
    tradingFrequency: '24',
    lastTradingTime: '2026-04-28 15:41:22',
    copiersEarnings: '+610.32',
    currentCopiers: '31',
    cumulativeCopiers: '49',
    profitShare: '11%',
    riskRating: '5',
    topTraded: [
      { pair: 'ETH', ratio: '50.00%', pnl: '+95.72', colorClassName: 'bg-[#2B6FE8]' },
      { pair: 'BTC', ratio: '50.00%', pnl: '+90.40', colorClassName: 'bg-[#F59E0B]' },
    ],
  },
  {
    id: '8',
    name: 'Neko_Venus...',
    alias: 'NV',
    market: 'Perp',
    followers: '47 / 2000',
    pnl: '+3,840.91%',
    drawdown: '30.18%',
    sharpe: '6.52',
    aum: '60,981.78',
    avatarClassName: 'from-neutral-500 to-neutral-700',
    bio: 'Balanced discretionary trading with low leverage.',
    roi: '+980.50%',
    roiUsdt: '+88.60 USDT',
    winRatio: '76%',
    principal: '278.00',
    totalPositions: '16',
    winPositions: '12',
    lossPositions: '4',
    averageProfit: '11.73',
    averageLoss: '3.42',
    pnlRatio: '3.43',
    copyTradingDays: '10D',
    averageHoldingTime: '7.45H',
    tradingFrequency: '16',
    lastTradingTime: '2026-04-27 19:02:50',
    copiersEarnings: '+143.18',
    currentCopiers: '6',
    cumulativeCopiers: '10',
    profitShare: '10%',
    riskRating: '6',
    topTraded: [
      { pair: 'BTC', ratio: '55.00%', pnl: '+51.24', colorClassName: 'bg-[#F59E0B]' },
      { pair: 'ETH', ratio: '45.00%', pnl: '+37.36', colorClassName: 'bg-[#2B6FE8]' },
    ],
  },
];

export function getCopyTraderById(id: string) {
  return COPY_TRADING_TRADERS.find((trader) => trader.id === id);
}
