// Get country flag from currency
export const getCurrencyFlag = (currency: string): string => {
  const flagMap: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    JPY: '🇯🇵',
    AUD: '🇦🇺',
    CAD: '🇨🇦',
    CHF: '🇨🇭',
    CNY: '🇨🇳',
    NZD: '🇳🇿',
    INR: '🇮🇳',
  };

  return flagMap[currency] || '🌍';
};

// Format time from ISO date string
export const formatTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${ampm}`;
  } catch {
    return '--:--';
  }
};
