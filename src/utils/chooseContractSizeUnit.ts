export function chooseContractSizeUnit(
  category: string,
  symbol: string,
  marginCurrency: string,
  t?: (key: string) => string,
): string {
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedSymbol = (symbol || '').toUpperCase();

  if (normalizedCategory === 'crypto' || normalizedCategory === 'forex') {
    return marginCurrency;
  }

  if (normalizedCategory === 'stock') {
    return normalizedSymbol;
  }
  if (['UKOUSD', 'USOUSD'].includes(normalizedSymbol)) {
    return t ? t('symbolDetail.units.barrels') : 'barrels';
  }
  if (normalizedSymbol === 'XNGUSD') {
    return t ? t('symbolDetail.units.mmbtu') : 'MMBtu';
  }
  if (['XAUUSD', 'XAGUSD', 'XPDUSD', 'XPTUSD'].includes(normalizedSymbol)) {
    return t ? t('symbolDetail.units.ounce') : 'oz';
  }
  if (normalizedCategory === 'commodities') {
    return t ? t('symbolDetail.units.ton') : 'ton';
  }
  return marginCurrency || '';
}
