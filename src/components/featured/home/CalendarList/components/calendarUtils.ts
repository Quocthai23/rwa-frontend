// Get country flag from currency
export const getCurrencyFlag = (currency: string): string => {
  const flagMap: Record<string, string> = {
    USD: 'đŸ‡ºđŸ‡¸',
    EUR: 'đŸ‡ªđŸ‡º',
    GBP: 'đŸ‡¬đŸ‡§',
    JPY: 'đŸ‡¯đŸ‡µ',
    AUD: 'đŸ‡¦đŸ‡º',
    CAD: 'đŸ‡¨đŸ‡¦',
    CHF: 'đŸ‡¨đŸ‡­',
    CNY: 'đŸ‡¨đŸ‡³',
    NZD: 'đŸ‡³đŸ‡¿',
    INR: 'đŸ‡®đŸ‡³',
  };

  return flagMap[currency] || 'đŸŒ';
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

