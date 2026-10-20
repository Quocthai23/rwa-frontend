const locales: Record<string, string> = {
  en: 'en-US', vi: 'vi-VN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
  es: 'es-ES', fr: 'fr-FR', de: 'de-DE', ru: 'ru-RU', pt: 'pt-PT',
  th: 'th-TH', id: 'id-ID', ar: 'ar-EG',
};
export const getIntlLocale = (language?: string) => locales[(language ?? 'en').split('-')[0]] ?? 'en-US';
export const formatVnd = (value: string | number | null | undefined, locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value ?? 0));
