'use client';

import { useEffect, useState } from 'react';

export const TINY_PHONE_MEDIA_QUERY = '(max-width: 375px)';

type LegacyMediaQueryList = {
  addListener?: (cb: () => void) => void;
  removeListener?: (cb: () => void) => void;
};

export function useMediaQuery(query: string, defaultValue = false) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);

    onChange();

    // Safari still uses addListener/removeListener for some versions.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }

    const mqAny = mq as unknown as LegacyMediaQueryList;
    mqAny.addListener?.(onChange);
    return () => mqAny.removeListener?.(onChange);
  }, [query]);

  return matches;
}

export function useIsTinyPhone() {
  return useMediaQuery(TINY_PHONE_MEDIA_QUERY, false);
}
