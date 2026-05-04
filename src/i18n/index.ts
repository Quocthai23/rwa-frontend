import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/i18n/resources/en';
import vi from '@/i18n/resources/vi';
import zh from '@/i18n/resources/zh';
import ja from '@/i18n/resources/ja';
import ko from '@/i18n/resources/ko';
import es from '@/i18n/resources/es';
import fr from '@/i18n/resources/fr';
import de from '@/i18n/resources/de';
import ru from '@/i18n/resources/ru';
import pt from '@/i18n/resources/pt';
import th from '@/i18n/resources/th';
import id from '@/i18n/resources/id';
import ar from '@/i18n/resources/ar';

export const SUPPORTED_LANGUAGES = [
  'en',
  'vi',
  'zh',
  'ja',
  'ko',
  'es',
  'fr',
  'de',
  'ru',
  'pt',
  'th',
  'id',
  'ar',
] as const;

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function normalizeToSupportedLanguage(code?: string): SupportedLanguage {
  if (!code) return 'en';
  const lower = code.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('ko')) return 'ko';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('th')) return 'th';
  if (lower.startsWith('id')) return 'id';
  if (lower.startsWith('ar')) return 'ar';
  if (lower.startsWith('vi')) return 'vi';
  return 'en';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeWithFallback<T extends Record<string, unknown>>(
  base: T,
  override: Partial<Record<string, unknown>>,
): T {
  const result: Record<string, unknown> = { ...base };

  Object.entries(override ?? {}).forEach(([key, value]) => {
    const baseValue = result[key];

    if (isPlainObject(baseValue) && isPlainObject(value)) {
      result[key] = mergeWithFallback(baseValue, value);
      return;
    }

    if (value !== undefined) {
      result[key] = value;
    }
  });

  return result as T;
}

if (!i18n.isInitialized) {
  const resources = {
    en: { translation: en },
    vi: { translation: mergeWithFallback(en, vi) },
    zh: { translation: mergeWithFallback(en, zh) },
    ja: { translation: mergeWithFallback(en, ja) },
    ko: { translation: mergeWithFallback(en, ko) },
    es: { translation: mergeWithFallback(en, es) },
    fr: { translation: mergeWithFallback(en, fr) },
    de: { translation: mergeWithFallback(en, de) },
    ru: { translation: mergeWithFallback(en, ru) },
    pt: { translation: mergeWithFallback(en, pt) },
    th: { translation: mergeWithFallback(en, th) },
    id: { translation: mergeWithFallback(en, id) },
    ar: { translation: mergeWithFallback(en, ar) },
  } as const;

  void i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
} else {
  const resources = {
    en,
    vi: mergeWithFallback(en, vi),
    zh: mergeWithFallback(en, zh),
    ja: mergeWithFallback(en, ja),
    ko: mergeWithFallback(en, ko),
    es: mergeWithFallback(en, es),
    fr: mergeWithFallback(en, fr),
    de: mergeWithFallback(en, de),
    ru: mergeWithFallback(en, ru),
    pt: mergeWithFallback(en, pt),
    th: mergeWithFallback(en, th),
    id: mergeWithFallback(en, id),
    ar: mergeWithFallback(en, ar),
  } as const;

  Object.entries(resources).forEach(([lng, translation]) => {
    i18n.addResourceBundle(lng, 'translation', translation, true, true);
  });
}

export default i18n;
