'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchLg } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import TabAsset from '@/components/featured/search/app/components/TabAsset';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
type Props = {
  onCancel?: () => void;
  onSelectSymbol?: (symbol: string) => void;
  isTrade?: boolean;
};

export default function Search({ onCancel, onSelectSymbol, isTrade }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const inputReference = useRef<HTMLInputElement | null>(null);

  return (
    <div className="bg-background flex h-dvh flex-col overflow-hidden">
      {isTrade && (
        <div className="px-4 pt-6">
          <h2 className="text-h2-semibold text-foreground">{t('search.marketWatch')}</h2>
        </div>
      )}

      <div className="flex flex-row items-center gap-1">
        <div
          className="bg-background relative flex w-full flex-1 items-center rounded-md py-4 pr-1 pl-4"
          onClick={() => inputReference.current?.focus()}
        >
          <Input
            autoFocus
            ref={inputReference}
            placeholder={t('search.placeholder')}
            className="text-body-large-regular text-foreground h-10 w-full flex-1 pl-8 shadow-none outline-none"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
            }}
            maxLength={10}
          />
          <SearchLg
            className="text-muted-foreground pointer-events-none absolute left-6"
            size={18}
          />
        </div>

        <Button
          variant="white-contained"
          className="px-3 py-2"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              router.back();
            }
          }}
        >
          <span className="text-button-large-medium">{t('search.cancel')}</span>
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {!searchText && !isTrade && (
          <div className="my-4 px-4">
            <p className="text-body-large-semibold text-foreground">{t('search.trendingTitle')}</p>
            <p className="text-body-small-regular text-muted-foreground mt-2">
              {t('search.trendingItem1')}
            </p>
            <p className="text-body-small-regular text-muted-foreground mt-2">
              {t('search.trendingItem2')}
            </p>
            <p className="text-body-small-regular text-muted-foreground mt-2">
              {t('search.trendingItem3')}
            </p>
          </div>
        )}
        <TabAsset searchText={searchText} onSelectSymbol={onSelectSymbol} isTrade={isTrade} />
      </div>
    </div>
  );
}
