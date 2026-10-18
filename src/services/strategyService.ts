import { apiClient } from './apiClient';
import type { GetStrategyPageRequest, StrategyPageResponse } from '@/types/strategy';

const isServer = typeof window === 'undefined';

/**
 * Proxy Mitrade strategy page.
 * Swagger: GET /strategy/page?{page,size,type,locale}
 */
export async function getStrategyPage(
  parameters: GetStrategyPageRequest = {},
): Promise<StrategyPageResponse> {
  const { page, size, type, locale, symbols } = parameters;

  if (isServer) {
    // Server-side: call external API directly (used by our internal Next.js API route).
    return apiClient.get<StrategyPageResponse>(
      '/strategy/page',
      {
        ...(page !== undefined ? { page } : {}),
        ...(size !== undefined ? { size } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(locale !== undefined ? { locale } : {}),
        ...(symbols !== undefined ? { symbols } : {}),
      },
      {
        // Strategy content is public; avoid requiring auth.
        skipAuth: true,
      },
    );
  }

  // Client-side: call internal proxy route.
  const searchParams = new URLSearchParams();
  if (page !== undefined) searchParams.set('page', String(page));
  if (size !== undefined) searchParams.set('size', String(size));
  if (type !== undefined) searchParams.set('type', String(type));
  if (locale !== undefined) searchParams.set('locale', String(locale));
  if (symbols !== undefined) searchParams.set('symbols', String(symbols));

  const res = await fetch(`/api/strategy/page?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch strategy page');
  }
  return (await res.json()) as StrategyPageResponse;
}

