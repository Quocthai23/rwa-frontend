/**
 * Ergonomic re-exports for the OpenAPI spec (`swagger-spec.json`).
 *
 * Regenerate types after updating the spec:
 *   yarn generate:swagger-types
 */
import type { components, operations, paths } from './swagger.generated';

export type { components, operations, paths } from './swagger.generated';

/** All named schemas from `components.schemas` */
export type SwaggerSchemas = components['schemas'];

export type Schema<K extends keyof SwaggerSchemas> = SwaggerSchemas[K];

/** Single OHLCV bar (epoch ms) — matches `GET /market-data/candles` items */
export type SwaggerCandle = components['schemas']['Candle'];

/** Wrapped candles payload from `GET /market-data/candles` */
export type SwaggerCandlesResponse = components['schemas']['CandlesResponse'];

export type SwaggerReferencePrice = components['schemas']['ReferencePrice'];

export type SwaggerValuationHistoryResponse = components['schemas']['ValuationHistoryResponse'];

export type SwaggerValuationHistoryItem = components['schemas']['ValuationHistoryItem'];

export type SwaggerAssetSummary = components['schemas']['AssetSummary'];

export type SwaggerAssetTicker = components['schemas']['AssetTicker'];

export type SwaggerCreateOrder = components['schemas']['CreateOrderDto'];

export type SwaggerUpdateOrder = components['schemas']['UpdateOrderDto'];

/** Query params for `GET /market-data/candles` */
export type GetMarketCandlesQuery =
  operations['MarketDataController_getCandles']['parameters']['query'];

/** Query params for `GET /market-data/reference-price` */
export type GetReferencePriceQuery =
  operations['MarketDataController_getReferencePrice']['parameters']['query'];

/**
 * Unwraps `{ success, data }` from a BFF `fetch().json()` where `data` may be either
 * a `CandlesResponse` object or a raw `Candle[]` (legacy / mixed backends).
 */
export function candlesArrayFromMarketDataFetch(json: unknown): SwaggerCandle[] {
  if (!json || typeof json !== 'object') return [];
  const root = json as { data?: unknown };
  const payload = root.data;
  if (Array.isArray(payload)) {
    return payload as SwaggerCandle[];
  }
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as SwaggerCandlesResponse).data)
  ) {
    return (payload as SwaggerCandlesResponse).data ?? [];
  }
  return [];
}
