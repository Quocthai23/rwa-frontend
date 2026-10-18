'use client';

import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { useToast } from '@/hook/useToast';
import { getAssets } from '@/services/assetsService';
import { redemptionApi, type RedemptionRequest } from '@/services/redemptionService';
import { useAccountStore } from '@/store/useAccountStore';
import type { Asset } from '@/types/assets';
import type { PortfolioItem } from '@/types';
import { File02, AlertCircle, CheckCircle, RefreshCcw01, ArrowRight } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RedemptionPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [userHoldingsPercent, setUserHoldingsPercent] = useState(0);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    async function loadPortfolio() {
      if (!selectedAccount?.id) {
        setPortfolioItems([]);
        return;
      }

      try {
        const { getPortfolioItems } = await import('@/services/portfolioService');
        const res = await getPortfolioItems({ accountId: selectedAccount.id });
        setPortfolioItems(res.data);
      } catch (e) {
        console.error(e);
      }
    }
    loadPortfolio();
  }, [selectedAccount?.id]);

  useEffect(() => {
    if (selectedAsset) {
      const item = portfolioItems.find(
        (portfolioItem) => portfolioItem.assetId === selectedAsset.id,
      );
      const qty = item ? Number(item.quantity || 0) : 0;
      const required = Number(selectedAsset.totalSupply || 0);
      setUserHoldingsPercent(required > 0 ? Math.min((qty / required) * 100, 100) : 0);
    }
  }, [selectedAsset, portfolioItems]);

  useEffect(() => {
    async function loadData() {
      try {
        const allAssets = await getAssets();
        setAssets(allAssets);
        if (allAssets.length > 0) {
          setSelectedAsset(allAssets[0]);
        }
      } catch (err) {
        console.error('Failed to load assets:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedAsset) return;
    const assetId = selectedAsset.id;
    async function loadRedemptions() {
      try {
        const list = await redemptionApi.getMyRedemptions(assetId);
        setRedemptions(list);
      } catch (err) {
        console.error('Failed to load redemptions:', err);
      }
    }
    loadRedemptions();
  }, [selectedAsset]);

  const handleRequestRedemption = async () => {
    if (!selectedAsset || !selectedAccount?.id) {
      showError('Account Required', 'Select a live account before requesting redemption.');
      return;
    }
    if (userHoldingsPercent < 100) {
      showError(
        'Ineligible for Redemption',
        'Asset redemption requires ownership of 100% of the total token supply to liquidate custody.',
      );
      return;
    }

    try {
      const response = await redemptionApi.requestRedeem(selectedAsset.id, selectedAccount.id);
      setRedemptions((prev) => [response, ...prev]);
      showSuccess(
        'Redemption Requested!',
        'Your request to claim physical deed custody has been filed. Our legal division will contact you shortly.',
      );
    } catch (err) {
      showError(
        'Redemption Request Failed',
        'An error occurred while submitting your custody request.',
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="border-primary-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full min-h-screen flex-col">
      <Header label="RWA Asset Redemption" onBack={() => router.push('/more')} />

      <div className="mx-auto w-full max-w-4xl flex-1 p-4 md:p-8">
        {/* Banner with premium glassmorphism */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-teal-900 via-emerald-950 to-indigo-950 p-6 text-white shadow-xl">
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-2">
              <File02 size={24} className="text-emerald-400" />
              <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                Custody Liquidation
              </span>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Physical Asset Redemption</h1>
            <p className="max-w-xl text-sm text-emerald-200">
              Acquire 100% of a real-world asset token supply to reclaim complete legal deed
              ownership and physical control of the underlying property.
            </p>
          </div>
          <div className="pointer-events-none absolute top-0 right-0 bottom-0 opacity-10">
            <File02 size={200} />
          </div>
        </div>

        {/* Asset Selector */}
        <div className="mb-8">
          <label className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wider uppercase">
            Select Target Asset
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  selectedAsset?.id === asset.id
                    ? 'bg-primary-500 shadow-primary-500/20 text-white shadow-md'
                    : 'bg-card border-border hover:bg-muted text-foreground border'
                }`}
              >
                {asset.symbol} - {asset.name}
              </button>
            ))}
          </div>
        </div>

        {selectedAsset && (
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Holdings Audit Card */}
            <div className="bg-card border-border flex flex-col justify-between rounded-2xl border p-6 md:col-span-2">
              <div>
                <h3 className="text-foreground mb-4 text-sm font-bold">Ownership Audit Ledger</h3>
                <div className="mb-2 flex items-end gap-2">
                  <span className="text-foreground text-3xl font-extrabold">
                    {userHoldingsPercent}%
                  </span>
                  <span className="text-muted-foreground mb-1 text-sm">of Total Supply</span>
                </div>
                <div className="bg-muted mb-4 h-4 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full transition-all ${
                      userHoldingsPercent === 100
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500'
                    }`}
                    style={{ width: `${userHoldingsPercent}%` }}
                  />
                </div>
              </div>

              {userHoldingsPercent < 100 ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <AlertCircle className="mt-0.5 shrink-0 text-amber-500" size={18} />
                  <div>
                    <span className="mb-1 block text-xs font-bold text-amber-500">
                      Insufficient Holdings
                    </span>
                    <p className="mb-3 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
                      You must purchase the remaining {(100 - userHoldingsPercent).toFixed(1)}% of
                      the {selectedAsset.symbol} supply to initiate redemption.
                    </p>
                    <button
                      onClick={() => router.push(`/trade/${selectedAsset.symbol}`)}
                      className="text-primary-500 hover:text-primary-600 inline-flex items-center gap-1.5 text-xs font-bold transition-all"
                    >
                      <span>Buy remaining tokens on Spot Market</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <CheckCircle className="mt-0.5 shrink-0 text-emerald-500" size={18} />
                  <div>
                    <span className="mb-1 block text-xs font-bold text-emerald-500">
                      Eligible for Custody Claim
                    </span>
                    <p className="text-xs leading-relaxed text-emerald-600 dark:text-emerald-400">
                      You hold 100% of the tokenized supply of {selectedAsset.name}. You are fully
                      eligible to lock your tokens and receive physical property custody.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Card */}
            <div className="bg-card border-border flex flex-col justify-between rounded-2xl border p-6">
              <div>
                <h3 className="text-foreground mb-2 text-sm font-bold">
                  Initiate Custody Transfer
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Submitting a redemption claim will lock 100% of the tokenized supply and launch
                  legal dossier processing for ownership transfer.
                </p>
              </div>

              <Button
                disabled={userHoldingsPercent < 100}
                onClick={handleRequestRedemption}
                className={`w-full rounded-xl py-6 font-bold transition-all ${
                  userHoldingsPercent === 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Request Custody Claim
              </Button>
            </div>
          </div>
        )}

        {/* Requests Logs */}
        <div className="space-y-4">
          <h2 className="text-foreground text-base font-bold">Redemption Request History</h2>

          {redemptions.length === 0 ? (
            <div className="bg-card border-border text-muted-foreground rounded-2xl border p-6 text-center text-sm">
              No custody claims have been initiated for this asset yet.
            </div>
          ) : (
            redemptions.map((red) => (
              <div
                key={red.id}
                className="bg-card border-border flex items-center justify-between gap-4 rounded-2xl border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary-500/10 text-primary-500 rounded-xl p-2">
                    <File02 size={20} />
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">
                      Request ID: {red.id}
                    </span>
                    <span className="text-foreground text-sm font-bold">
                      {selectedAsset?.symbol} Custody Liquidation
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground hidden text-xs sm:inline">
                    {new Date(red.requestedAt).toLocaleDateString()}
                  </span>
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
                    {red.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
