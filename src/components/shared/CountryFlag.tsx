import React from 'react';
import { getCountryFlag } from '@/services/calendarService';

export type CountryFlagProps = {
  countryCode: string;
  className?: string;
};

export const CountryFlag: React.FC<CountryFlagProps> = ({ countryCode, className = '' }) => {
  const flagEmoji = getCountryFlag(countryCode);

  const isWindows = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);

  const iso = countryCode ? countryCode.toUpperCase().slice(0, 2) : '';
  const imgSrc = iso ? `https://flagcdn.com/24x18/${iso.toLowerCase()}.png` : '';

  return (
    <span className={`inline-flex items-center justify-center ${className}`} title={countryCode}>
      {isWindows && imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={countryCode}
          width={18}
          height={14}
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.replaceWith(document.createTextNode(flagEmoji));
          }}
          style={{ display: 'block' }}
        />
      ) : (
        flagEmoji
      )}
    </span>
  );
};
