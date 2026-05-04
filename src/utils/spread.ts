export type SpreadScaleKind = 'metals_point' | 'forex_pip' | 'raw';

const METAL_PREFIXES = ['XAU', 'XAG'] as const;

function isMetalSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return METAL_PREFIXES.some((p) => s.startsWith(p));
}

function isJpyForexPair(symbol: string): boolean {
  const s = symbol.toUpperCase();
  // Classic FX symbol shape: "EURUSD", "USDJPY", etc.
  return s.length >= 6 && s.slice(3, 6) === 'JPY';
}

export function getSpreadScale({
  symbol,
  priceDigit,
}: {
  readonly symbol: string;
  readonly priceDigit: number;
}): { readonly scale: number; readonly kind: SpreadScaleKind } {
  // Metals: UI shows "points" (Ask-Bid) * 100
  if (isMetalSymbol(symbol)) {
    return { scale: 100, kind: 'metals_point' };
  }

  // Forex: show spread in pips (not raw price diff)
  // - Non-JPY pairs: pip = 0.0001  => scale = 10_000
  // - JPY pairs:     pip = 0.01    => scale = 100
  //
  // When digit is known (MT5 digit), pip scale can be derived:
  // pip = point * 10 for most FX pricing => scale = 10^(digit-1)
  if (priceDigit >= 2) {
    if (isJpyForexPair(symbol)) return { scale: 100, kind: 'forex_pip' };
    if (priceDigit >= 3) return { scale: Math.pow(10, priceDigit - 1), kind: 'forex_pip' };
  }

  return { scale: 1, kind: 'raw' };
}

export function calculateScaledSpread({
  bid,
  ask,
  symbol,
  priceDigit,
}: {
  readonly bid: number;
  readonly ask: number;
  readonly symbol: string;
  readonly priceDigit: number;
}): number {
  if (!bid || !ask) return 0;
  const { scale } = getSpreadScale({ symbol, priceDigit });
  return (ask - bid) * scale;
}
