'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';

export function NewsCategories() {
  const { t } = useTranslation();
  const categories = [
    t('discover.categories.follow'),
    t('discover.categories.recommend'),
    t('discover.categories.latest'),
  ];
  const [activeCat, setActiveCat] = useState(categories[0]);
  const { colors } = useTheme();

  return (
    <div className="border-border flex flex-row items-center border-b">
      {categories.map((cat) => {
        const isActive = activeCat === cat;
        return (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className="text-body-large-medium flex flex-1 items-center justify-center py-3"
            style={{
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: isActive ? colors.primary500 : 'transparent',
            }}
          >
            <span
              style={{
                color: isActive ? colors.primary500 : colors.neutral500,
              }}
            >
              {cat}
            </span>
          </button>
        );
      })}
    </div>
  );
}
