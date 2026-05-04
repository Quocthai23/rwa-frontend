type SanitizeDecimalInputOptions = {
  maxDecimalPlaces?: number;
  minValue?: number;
  maxValue?: number;
};

export function sanitizeDecimalInput(
  rawValue: string,
  options: SanitizeDecimalInputOptions = {},
): string {
  const { maxDecimalPlaces, minValue = 0, maxValue } = options;

  if (rawValue === '') return '';

  let sanitized = '';
  let dotSeen = false;
  for (const ch of rawValue) {
    if (ch >= '0' && ch <= '9') {
      sanitized += ch;
      continue;
    }
    if (ch === '.' && !dotSeen) {
      dotSeen = true;
      sanitized += ch;
    }
  }

  if (sanitized === '') return '';
  if (sanitized === '.') return '0.';

  const [intPart, decPart = ''] = sanitized.split('.');
  const limitedDecPart =
    typeof maxDecimalPlaces === 'number' ? decPart.slice(0, maxDecimalPlaces) : decPart;
  const hasDot = sanitized.includes('.');
  const normalized = hasDot ? `${intPart}.${limitedDecPart}` : intPart;

  const numericValue = Number.parseFloat(normalized);
  if (Number.isNaN(numericValue)) return '';

  if (numericValue < minValue) return String(minValue);
  if (typeof maxValue === 'number' && Number.isFinite(maxValue) && numericValue > maxValue) {
    return String(maxValue);
  }

  return normalized;
}
