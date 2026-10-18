export type BaseSearchableAsset = {
  symbol?: string;
  name?: string;
  marginCurrency?: string;
  profitCurrency?: string;
  isFavorite?: boolean;
};

export const normalizeSymbol = (symbol?: string) =>
  (symbol ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');

export const getSymbolTokens = <T extends BaseSearchableAsset>(item: T) => {
  const base = (item.marginCurrency ?? '').toLowerCase().trim();
  const quote = (item.profitCurrency ?? '').toLowerCase().trim();
  if (base && quote) return { base, quote };

  const compact = normalizeSymbol(item.symbol);
  if (compact.length >= 6) return { base: compact.slice(0, 3), quote: compact.slice(3, 6) };
  return { base: compact, quote: '' };
};

export function filterAndSortAssets<T extends BaseSearchableAsset>(
  assets: T[],
  searchText: string,
  maxResults?: number,
): T[] {
  const rawQuery = (searchText ?? '').toLowerCase().trim();
  const query = rawQuery.replace(/[^a-z0-9]/g, '');
  if (!rawQuery) {
    return maxResults ? assets.slice(0, Math.max(1, maxResults)) : assets;
  }
  if (rawQuery && !query) {
    return [];
  }

  const isVeryShortQuery = query.length <= 1;

  const scored = assets
    .map((item) => {
      const symbolNorm = normalizeSymbol(item.symbol);
      const { base, quote } = getSymbolTokens(item);
      const name = (item.name ?? '').toLowerCase();

      let isMatch = false;
      if (isVeryShortQuery) {
        isMatch =
          symbolNorm.startsWith(query) ||
          base.startsWith(query) ||
          quote.startsWith(query) ||
          name.startsWith(rawQuery) ||
          name.includes(` ${rawQuery}`);
      } else {
        isMatch =
          symbolNorm.includes(query) ||
          base.includes(query) ||
          quote.includes(query) ||
          name.includes(rawQuery);
      }

      if (!isMatch) {
        return { item, score: -1 };
      }

      let score = 10;
      if (symbolNorm === query) score = 0;
      else if (base === query || quote === query) score = 1;
      else if (symbolNorm.startsWith(query) || base.startsWith(query) || quote.startsWith(query))
        score = 2;
      else if (name.startsWith(rawQuery)) score = 3;
      else if (symbolNorm.includes(query) || base.includes(query) || quote.includes(query))
        score = 4;
      else if (name.includes(rawQuery)) score = 5;

      return { item, score };
    })
    .filter((x) => x.score !== -1);
  const sorted = scored.sort((a, b) => {
    if (a.item.isFavorite && !b.item.isFavorite) return -1;
    if (!a.item.isFavorite && b.item.isFavorite) return 1;
    return a.score - b.score;
  });

  const results = sorted.map((x) => x.item);
  return maxResults ? results.slice(0, Math.max(1, maxResults)) : results;
}

