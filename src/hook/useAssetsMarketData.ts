import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getAssetMarketData } from '@/services/assetsService';
import type { AssetMarketData } from '@/types/assets';

export type AssetsMarketDataById = Record<string, AssetMarketData | undefined>;

export function useAssetsMarketData(assetIds: string[], enabled = true) {
    const stableIds = useMemo(() => {
        return Array.from(new Set(assetIds.filter(Boolean))).sort();
    }, [assetIds]);

    const idsKey = stableIds.join('|');

    return useQuery({
        queryKey: ['assets', 'market-data', idsKey],
        enabled: enabled && stableIds.length > 0,
        queryFn: async () => {
            const results = await Promise.allSettled(
                stableIds.map(async (assetId) => ({ assetId, data: await getAssetMarketData(assetId) })),
            );

            return results.reduce<AssetsMarketDataById>((acc, result) => {
                if (result.status === 'fulfilled') {
                    acc[result.value.assetId] = result.value.data;
                }
                return acc;
            }, {});
        },
    });
}
