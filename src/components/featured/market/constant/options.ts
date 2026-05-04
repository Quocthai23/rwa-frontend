export const sortByOptions = [
  {
    id: 'default',
    label: 'Default',
    name: 'Default',
    labelKey: 'market.sort.default',
    nameKey: 'market.sort.default',
  },
  {
    id: 'percentChange_hight_to_low',
    label: '% Change: (High to Low)',
    name: '% Change',
    labelKey: 'market.sort.percentChangeHighToLow',
    nameKey: 'market.sort.percentChange',
  },
  {
    id: 'percentChange_low_to_high',
    label: '% Change: (Low to High)',
    name: '% Change',
    labelKey: 'market.sort.percentChangeLowToHigh',
    nameKey: 'market.sort.percentChange',
  },
  {
    id: 'price_high_to_low',
    label: 'Price: (High to Low)',
    name: 'Price',
    labelKey: 'market.sort.priceHighToLow',
    nameKey: 'market.sort.price',
  },
  {
    id: 'price_low_to_high',
    label: 'Price: (Low to High)',
    name: 'Price',
    labelKey: 'market.sort.priceLowToHigh',
    nameKey: 'market.sort.price',
  },
  {
    id: 'volatility_high_to_low',
    label: 'Volatility: (High to Low)',
    name: 'Volatility',
    labelKey: 'market.sort.volatilityHighToLow',
    nameKey: 'market.sort.volatility',
  },
  {
    id: 'volatility_low_to_high',
    label: 'Volatility: (Low to High)',
    name: 'Volatility',
    labelKey: 'market.sort.volatilityLowToHigh',
    nameKey: 'market.sort.volatility',
  },
];

export const filterCategoryOptions = [
  { id: 'all', option: 'All', optionKey: 'market.categoryOptions.all' },
  { id: 'forex', option: 'Forex', optionKey: 'market.categoryOptions.forex' },
  { id: 'commodities', option: 'Commodities', optionKey: 'market.categoryOptions.commodities' },
  { id: 'share', option: 'Share', optionKey: 'market.categoryOptions.share' },
  { id: 'indices', option: 'Indices', optionKey: 'market.categoryOptions.indices' },
  { id: 'crypto', option: 'Crypto', optionKey: 'market.categoryOptions.crypto' },
  { id: 'etfs', option: 'ETFs', optionKey: 'market.categoryOptions.etfs' },
  { id: 'bonds', option: 'Bonds', optionKey: 'market.categoryOptions.bonds' },
];

export const filterCategoryStatus = [
  { id: 'all', option: 'All', optionKey: 'market.categoryOptions.all' },
  { id: 'market_open', option: 'Market Open', optionKey: 'market.statusOptions.marketOpen' },
];
