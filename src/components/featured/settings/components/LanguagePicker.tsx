'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, SearchLg } from '@untitledui/icons';
import { useTheme } from '@/theme';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';

export type LanguageOption = {
  code: string;
  label: string;
  region?: string;
};

const LANGUAGE_CODES = [
  'en-EN',
  'vi-VN',
  'zh-CN',
  'ja-JP',
  'ko-KR',
  'es-ES',
  'fr-FR',
  'de-DE',
  'ru-RU',
  'pt-BR',
  'th-TH',
  'id-ID',
  'ar-SA',
] as const;

const REGION_LABEL_OVERRIDES: Record<string, string> = {
  UK: 'UK',
  US: 'US',
  EN: 'EN',
  CN: 'CN',
  JP: 'JP',
  KR: 'KR',
  ES: 'ES',
  FR: 'FR',
  DE: 'DE',
  RU: 'RU',
  BR: 'BR',
  TH: 'TH',
  ID: 'ID',
  SA: 'SA',
};

function normalizeLocale(code: string): string {
  if (code === 'en-EN') return 'en';
  return code;
}

function buildLanguageOptions(displayLocale: string): LanguageOption[] {
  const languageNames = new Intl.DisplayNames([displayLocale], { type: 'language' });
  const regionNames = new Intl.DisplayNames([displayLocale], { type: 'region' });

  return LANGUAGE_CODES.map((code) => {
    const normalized = normalizeLocale(code);
    const [languagePart, regionPart] = normalized.split('-');

    const languageLabel = languageNames.of(languagePart) ?? languagePart;
    const resolvedRegion =
      regionPart != null
        ? (REGION_LABEL_OVERRIDES[regionPart] ?? regionNames.of(regionPart) ?? regionPart)
        : undefined;

    return {
      code,
      label: languageLabel,
      region: resolvedRegion,
    };
  });
}

export function getLanguagePickerDisplayText(option: LanguageOption): string {
  return option.region ? `${option.label} (${option.region})` : option.label;
}

export function getLanguageLabelForSetting(appLanguageCode: string): string {
  const code = appLanguageCode ?? 'en-EN';
  const displayLocale = normalizeLocale(code);
  const options = buildLanguageOptions(displayLocale);
  const option =
    options.find((o) => o.code === code) ?? options.find((o) => toAppLanguage(o.code) === code);
  return option?.label ?? normalizeLocale(code);
}

const toAppLanguage = (code: string): string => {
  if (code === 'en' || code.startsWith('en-')) return 'en-EN';
  return code;
};

interface LanguagePickerProps {
  autoFocusSearch?: boolean;
  currentLanguage?: string;
  onDismiss: () => void;
  onSelect: (languageCode: string) => void;
}

export function LanguagePicker({
  autoFocusSearch = false,
  currentLanguage,
  onDismiss,
  onSelect,
}: LanguagePickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const appLanguage = useAppStore((s) => s.language ?? 'en-EN');
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const displayLocale = useMemo(() => normalizeLocale(appLanguage), [appLanguage]);

  const effectiveCurrent = useMemo(() => {
    if (!currentLanguage) return 'en-EN';
    return toAppLanguage(currentLanguage);
  }, [currentLanguage]);

  const languageOptions = useMemo(() => buildLanguageOptions(displayLocale), [displayLocale]);

  const filtered = useMemo(() => {
    if (!query.trim()) return languageOptions;
    const q = query.toLowerCase();
    return languageOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        (o.region?.toLowerCase().includes(q) ?? false),
    );
  }, [languageOptions, query]);

  useEffect(() => {
    if (!autoFocusSearch) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => {
      window.clearTimeout(timer);
    };
  }, [autoFocusSearch]);

  return (
    <>
      <div className="bg-background flex flex-row items-center px-4">
        <div className="border-border flex h-10 flex-1 flex-row items-center rounded-sm border pl-3">
          <SearchLg size={18} className="text-muted-foreground" />
          <Input
            ref={searchInputRef}
            className="text-body-large-regular text-foreground placeholder-muted-foreground ml-2 flex-1 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder={t('common.search')}
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="white-contained" className="h-auto px-3 py-2.5" onClick={onDismiss}>
          <span className="text-button-large-medium">{t('common.cancel')}</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.map((item) => {
          const isActive = effectiveCurrent === item.code;
          return (
            <button
              key={item.code}
              onClick={() => {
                onSelect(toAppLanguage(item.code));
              }}
              className="hover:bg-muted flex w-full flex-row items-center justify-between rounded-xl px-4 py-3.5 transition-colors"
            >
              <span
                className="text-body-large-regular text-foreground!"
                style={{
                  color: isActive ? colors.primary500 : colors.neutral900,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {getLanguagePickerDisplayText(item)}
              </span>
              {isActive && <Check size={24} color={colors.primary500} strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
