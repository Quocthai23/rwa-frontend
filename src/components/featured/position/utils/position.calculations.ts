import Decimal from 'decimal.js';
import { Position, Asset } from '@/types';
import { OrderItem, OrderSide } from '@/types/orders';
import { toDecimal } from '@/utils/decimal';

type Price = {
  bid?: number | string;
  ask?: number | string;
};

type UnrealizedPnL = Pick<
  Position,
  'side' | 'openPrice' | 'symbol' | 'contractSize' | 'quantity' | 'profitCurrency'
>;

const getPriceBySide = (price: Price, side: number) => {
  if (!price) return null;
  return toDecimal(side === OrderSide.BUY ? price.bid : price.ask);
};
const getBaseQuote = (symbol: string, profitCurrency?: string) => {
  // If we have profitCurrency, use it to determine quote
  if (profitCurrency) {
    const base = symbol.replace(profitCurrency, '');
    if (base && base !== symbol) {
      return {
        base,
        quote: profitCurrency,
      };
    }
  }

  // Fallback: USD-based pairs
  if (symbol.endsWith('USD')) {
    return {
      base: symbol.slice(0, -3),
      quote: 'USD',
    };
  }

  if (symbol.startsWith('USD')) {
    return {
      base: 'USD',
      quote: symbol.slice(3),
    };
  }
};
const getConversionRate = (
  symbol: string,
  side: number,
  rtBySymbol: Record<string, Price>,
  profitCurrency: string,
): Decimal => {
  const { base, quote } = getBaseQuote(symbol, profitCurrency) || {};
  // TH1 quote = USD
  if (quote === 'USD') {
    return new Decimal(1);
  }

  // TH2 base = USD
  if (base === 'USD') {
    const price = getPriceBySide(rtBySymbol[symbol], side);
    if (!price) return new Decimal(1);
    return new Decimal(1).div(price);
  }

  // TH3 quoteUSD
  const direct = quote + 'USD';
  if (rtBySymbol[direct]) {
    const price = getPriceBySide(rtBySymbol[direct], side);
    if (!price) return new Decimal(1);
    return price;
  }

  // TH3 USDquote
  const reverse = 'USD' + quote;
  if (rtBySymbol[reverse]) {
    const price = getPriceBySide(rtBySymbol[reverse], side);
    if (!price) return new Decimal(1);
    return new Decimal(1).div(price);
  }

  return new Decimal(1);
};

export const calculatePositionFields = (position: Position, rtBySymbol: Record<string, Price>) => {
  if (!position) return;
  const isBuy = position.side === OrderSide.BUY;
  const openPriceDecimal = toDecimal(position.openPrice);
  if (!openPriceDecimal || openPriceDecimal.lte(0)) return;

  const openPrice = openPriceDecimal.toNumber();
  const rt = rtBySymbol?.[position.symbol];
  const currentPriceDecimal = toDecimal(isBuy ? rt?.bid : rt?.ask);
  const currentPrice = currentPriceDecimal?.toNumber() ?? 0;

  const contractSize = position?.contractSize || 100;
  const digit = position?.digit || 2;
  const quantityDecimal = toDecimal(position.quantity);
  const quantity = quantityDecimal?.toNumber() ?? 0;

  if (
    !currentPriceDecimal ||
    currentPriceDecimal.lte(0) ||
    !quantityDecimal ||
    quantityDecimal.lte(0)
  ) {
    return {
      isBuy,
      openPrice,
      currentPrice,
      contractSize,
      digit,
      quantity,
      priceDiff: 0,
      profit: 0,
      percentage: 0,
    };
  }

  const priceDiffDecimal = isBuy
    ? currentPriceDecimal.minus(openPriceDecimal)
    : openPriceDecimal.minus(currentPriceDecimal);
  const priceDiff = priceDiffDecimal.toNumber();

  const rate = getConversionRate(
    position.symbol,
    position.side,
    rtBySymbol,
    position.profitCurrency as string,
  );

  const profit = new Decimal(priceDiff).mul(quantity).mul(contractSize).mul(rate).toNumber();
  const percentage = priceDiffDecimal.div(openPriceDecimal).mul(100).toNumber();

  return {
    isBuy,
    openPrice,
    currentPrice,
    contractSize,
    digit,
    quantity,
    priceDiff,
    profit,
    percentage,
  };
};

export const calculateUnrealizedPnL = (
  position: UnrealizedPnL,
  rtBySymbol: Record<string, Price>,
): number => {
  const isBuy = position.side === OrderSide.BUY;
  const openPrice = toDecimal(position.openPrice);
  if (!openPrice || openPrice.lte(0)) return 0;
  const rt = rtBySymbol?.[position.symbol];

  const realtimePrice = toDecimal(isBuy ? rt?.bid : rt?.ask);
  if (!realtimePrice || realtimePrice.lte(0)) return 0;

  const contractSize = new Decimal(position?.contractSize || 100);
  const quantity = toDecimal(position.quantity);
  if (!quantity || quantity.lte(0)) return 0;

  const priceDiff = isBuy ? realtimePrice.minus(openPrice) : openPrice.minus(realtimePrice);

  const profitCurrency = position.profitCurrency;
  const rate = getConversionRate(
    position.symbol,
    OrderSide.BUY,
    rtBySymbol,
    profitCurrency ?? 'USD',
  );

  return priceDiff.mul(quantity).mul(contractSize).mul(rate).toNumber();
};

type CalcPnLUsdInput = {
  side: OrderSide;
  openPrice: number;
  targetPrice: number;
  lotNumber: number;
  symbol: string;
  rtBySymbol: Record<string, Price>;
  contractSize?: number;
  profitCurrency: string;
};

export const calcPnLUsd = ({
  side,
  openPrice,
  targetPrice,
  lotNumber,
  symbol,
  rtBySymbol,
  contractSize = 100,
  profitCurrency,
}: CalcPnLUsdInput): number | null => {
  const lotDecimal = toDecimal(lotNumber);
  if (!lotDecimal || lotDecimal.lte(0)) return null;

  const openPriceDecimal = toDecimal(openPrice);
  if (!openPriceDecimal || openPriceDecimal.lte(0)) return null;

  const targetPriceDecimal = toDecimal(targetPrice);
  if (!targetPriceDecimal) return null;
  if (!rtBySymbol) return null;

  const safeOpenPrice = openPriceDecimal.toNumber();
  const safeTargetPrice = targetPriceDecimal.toNumber();
  const safeLotNumber = lotDecimal.toNumber();

  const tmpRtBySymbol: Record<string, Price> = {
    ...rtBySymbol,
    [symbol]: {
      ...rtBySymbol?.[symbol],
      bid: safeTargetPrice,
      ask: safeTargetPrice,
    },
  };

  const market: UnrealizedPnL = {
    side,
    symbol,
    openPrice: String(safeOpenPrice),
    quantity: String(safeLotNumber),
    contractSize,
    profitCurrency,
  };
  return calculateUnrealizedPnL(market, tmpRtBySymbol);
};

export const calculateTotalUnrealizedPnL = (
  openPositions: Position[],
  rtBySymbol: Record<string, Price>,
): number => {
  return openPositions.reduce<number>((acc, position) => {
    return acc + Number(calculateUnrealizedPnL(position, rtBySymbol) || 0);
  }, 0);
};

export const calculateTotalFee = (openPositions: Position[]): number => {
  return openPositions
    .reduce<Decimal>((acc, position) => {
      const swap = new Decimal(position.unrealizedSwap ?? 0);
      const fees = new Decimal(position.unrealizedFees ?? 0);
      return acc.plus(swap).plus(fees);
    }, new Decimal(0))
    .toNumber();
};

export const calculateOrderMargin = (
  lot: number,
  price: number,
  symbol: string,
  leverage: number,
  contractSize: number = 100,
  rtBySymbol: Record<string, Price> = {},
  profitCurrency: string,
): number => {
  const lotDecimal = toDecimal(lot);
  const priceDecimal = toDecimal(price);
  if (
    !leverage ||
    !contractSize ||
    !lotDecimal ||
    lotDecimal.lte(0) ||
    !priceDecimal ||
    priceDecimal.lte(0)
  ) {
    return 0;
  }

  const rate = getConversionRate(symbol, 1, rtBySymbol, profitCurrency).toNumber() || 1;
  return (lot * contractSize * price * rate) / leverage;
};

export const isAvailableBalanceSufficient = (
  availableBalance: number,
  requiredMargin: number,
): boolean => {
  return availableBalance >= requiredMargin;
};

export const calculateAccountBalance = (
  lockedBalance?: string | number | null,
  availableBalance?: string | number | null,
): number => {
  return new Decimal(lockedBalance || 0).plus(availableBalance || 0).toNumber();
};

export const calculateTotalMargin = (positions: Array<Pick<Position, 'margin'>>): number => {
  return positions
    .reduce<Decimal>((acc, position) => acc.plus(new Decimal(position.margin || 0)), new Decimal(0))
    .toNumber();
};

export const calculateAvailableBalance = (equity: number, margin: number): number => {
  return new Decimal(equity).minus(margin).toNumber();
};

export const mapPositionsWithAssets = (
  positions: Position[],
  assets: Asset[] | undefined,
): Position[] => {
  if (!assets || assets.length === 0) return positions;

  // Create asset map for O(1) lookups
  const assetMap = new Map<string, Asset>();
  assets.forEach((asset) => assetMap.set(asset.symbol, asset));

  // Enrich each position with matching asset data
  return positions.map((position) => {
    const matchingAsset = assetMap.get(position.symbol);
    if (!matchingAsset) return position;

    return {
      ...position,
      symbolName: matchingAsset.name,
      contractSize: Number(matchingAsset.contractSize),
      profitCurrency: matchingAsset.profitCurrency,
    };
  });
};

type PositionPage = { data: Position[] };

export const getEnrichedPositionsFromInfiniteData = (
  positionData: { pages?: PositionPage[] } | undefined,
  assets: Asset[] | undefined,
): Position[] => {
  const positions = positionData?.pages?.flatMap((page) => page.data) ?? [];
  return mapPositionsWithAssets(positions, assets);
};

export const splitPositionsByPnL = (
  positions: Position[],
  rtBySymbol: Record<string, Price>,
): { profitablePositions: Position[]; losingPositions: Position[] } => {
  return positions.reduce(
    (acc, position) => {
      const pnl = calculateUnrealizedPnL(position, rtBySymbol);
      if (pnl > 0) acc.profitablePositions.push(position);
      if (pnl < 0) acc.losingPositions.push(position);
      return acc;
    },
    { profitablePositions: [], losingPositions: [] } as {
      profitablePositions: Position[];
      losingPositions: Position[];
    },
  );
};

type OrderItemWithExtra = OrderItem & {
  digit: number;
  symbol: string;
};
export const enrichOrdersWithAssets = (
  orders: OrderItem[],
  assets: Asset[] | undefined,
): OrderItemWithExtra[] => {
  const assetMap = new Map<string, Asset>();
  assets?.forEach((asset) => assetMap.set(asset.symbol, asset));

  return orders.map((order) => {
    const asset = assetMap.get(order.symbol);

    return {
      ...order,
      digit: asset?.digit ?? 2,
      symbolName: asset?.name ?? order.symbol,
    };
  });
};
